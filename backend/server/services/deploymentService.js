// backend/server/services/deploymentService.js
// Orchestrates the full deployment pipeline:
//   1. Generate project server code
//   2. Write to temp directory
//   3. Build Docker image
//   4. Run container
//   5. Return live API URL
//
// Handles both local Docker and simulated cloud deployment.

const prisma = require('../../config/prisma');
const { writeProjectFilesToTemp } = require('./codeGeneratorService');
const { isDockerAvailable, buildImage, findAvailablePort, runContainer, stopContainer, restartContainer, getContainerStatus, getContainerLogs, removeImage } = require('./containerService');
const { appendLog } = require('./logService');
const { buildPgTableName } = require('../controllers/projectTableController');
const fs = require('fs');

const DEPLOY_PROVIDER = process.env.DEPLOY_PROVIDER || 'local';

/**
 * Deploy a project.
 * Creates a Deployment record, runs the pipeline, updates status.
 *
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<Deployment>}
 */
const deployProject = async (projectId, userId) => {
  // Create deployment record in pending state
  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      status: 'pending',
      provider: DEPLOY_PROVIDER,
    },
  });

  const log = (msg, level = 'info') => appendLog(deployment.id, msg, level);

  // Run pipeline asynchronously (don't block the HTTP response)
  runDeploymentPipeline(deployment.id, projectId, log).catch(async (err) => {
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: { status: 'failed', errorMessage: err.message },
    });
    await log(`Deployment failed: ${err.message}`, 'error');
  });

  return deployment;
};

/**
 * The actual deployment pipeline — runs in the background.
 */
const runDeploymentPipeline = async (deploymentId, projectId, log) => {
  const shortId = projectId.replace(/-/g, '').slice(0, 8);
  const imageName     = `stackbase_prj_${shortId}`;
  const containerName = `stackbase_prj_${shortId}`;

  // ── Step 1: Mark as building ───────────────────────────────────────────────
  await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'building' } });
  await log(`[${new Date().toISOString()}] Deployment started for project ${shortId}`, 'info');

  // ── Step 2: Load project data ──────────────────────────────────────────────
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tables: true,
      apiKeys: { select: { key: true, name: true } },
    },
  });

  if (!project) throw new Error('Project not found');

  // Attach pgTableName to each table
  const tables = project.tables.map((t) => ({
    ...t,
    pgTableName: buildPgTableName(projectId, t.tableName),
  }));

  await log(`Loaded project: "${project.name}" — ${tables.length} table(s), ${project.apiKeys.length} API key(s)`, 'info');

  if (DEPLOY_PROVIDER === 'local') {
    await runLocalDockerDeployment(deploymentId, project, tables, project.apiKeys, imageName, containerName, log);
  } else {
    // Simulated cloud deployment for environments without Docker
    await runSimulatedDeployment(deploymentId, project, tables, log);
  }
};

/**
 * Full Docker-based local deployment.
 */
const runLocalDockerDeployment = async (deploymentId, project, tables, apiKeys, imageName, containerName, log) => {
  // Check Docker availability
  const dockerOk = await isDockerAvailable();
  if (!dockerOk) {
    await log('Docker daemon not available — falling back to simulated deployment', 'warn');
    return runSimulatedDeployment(deploymentId, project, tables, log);
  }

  let tmpDir;
  try {
    // ── Step 3: Generate code ────────────────────────────────────────────────
    await log('Generating project server code...', 'info');
    tmpDir = await writeProjectFilesToTemp(project, tables, apiKeys);
    await log(`Project code written to ${tmpDir}`, 'info');

    // ── Step 4: Build Docker image ───────────────────────────────────────────
    await log(`Building Docker image: ${imageName}`, 'info');
    await buildImage(tmpDir, imageName, (line) => log(line, 'info'));
    await log(`Docker image built: ${imageName}`, 'success');

    // ── Step 5: Find port & run container ────────────────────────────────────
    const hostPort = await findAvailablePort();
    await log(`Assigning port ${hostPort} to container`, 'info');

    const { containerId, port, apiUrl } = await runContainer(imageName, containerName, hostPort);
    await log(`Container started: ${containerName} (${containerId.slice(0, 12)})`, 'success');
    await log(`API URL: ${apiUrl}`, 'success');

    // ── Step 6: Update deployment record ─────────────────────────────────────
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'running',
        containerId,
        containerName,
        port,
        apiUrl,
        deployedAt: new Date(),
      },
    });

    await log(`[${new Date().toISOString()}] Deployment complete — server is live at ${apiUrl}`, 'success');

  } finally {
    // Clean up temp files
    if (tmpDir) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }
};


const runSimulatedDeployment = async (deploymentId, project, tables, log) => {
  await log('Using single backend (no separate server)', 'info');

  const apiUrl = `${process.env.API_BASE_URL}/api/project/${project.id}`;

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      status: 'running',
      containerId: `sim_${project.id}`,
      containerName: `stackbase_prj_${project.id.slice(0,8)}`,
      port: null,
      apiUrl,
      deployedAt: new Date(),
    },
  });

  await log(`API ready at ${apiUrl}`, 'success');
};


const stopDeployment = async (deploymentId) => {
  const dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
  if (!dep) throw new Error('Deployment not found');
  if (dep.containerId && !dep.containerId.startsWith('sim_')) {
    await stopContainer(dep.containerName || dep.containerId);
  }
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: 'stopped', stoppedAt: new Date() },
  });
  await appendLog(deploymentId, 'Deployment stopped', 'warn');
};

/**
 * Restart a deployment container.
 */
const restartDeployment = async (deploymentId) => {
  const dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
  if (!dep) throw new Error('Deployment not found');

  await appendLog(deploymentId, 'Restarting container...', 'warn');

  if (dep.containerId && !dep.containerId.startsWith('sim_')) {
    await restartContainer(dep.containerName || dep.containerId);
    const status = await getContainerStatus(dep.containerName || dep.containerId);
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: status === 'running' ? 'running' : 'failed' },
    });
  } else {
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'running' } });
  }

  await appendLog(deploymentId, 'Container restarted successfully', 'success');
  return prisma.deployment.findUnique({ where: { id: deploymentId } });
};

/**
 * Get all deployments for a project.
 */
const getProjectDeployments = async (projectId) => {
  return prisma.deployment.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { logs: true } } },
  });
};

module.exports = {
  deployProject,
  stopDeployment,
  restartDeployment,
  getProjectDeployments,
};

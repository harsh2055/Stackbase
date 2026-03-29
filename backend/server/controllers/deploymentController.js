// backend/server/controllers/deploymentController.js
// HTTP handlers for the deployment system.

const prisma = require('../../config/prisma');
const { deployProject, stopDeployment, restartDeployment, getProjectDeployments } = require('../services/deploymentService');
const { getLogs, getProjectLogs, subscribe } = require('../services/logService');
const { getContainerLogs } = require('../services/containerService');

/**
 * POST /projects/:projectId/deployments
 * Trigger a new deployment for a project.
 * Returns immediately with a deployment record — the build runs in the background.
 */
const triggerDeploy = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    // Check if a build is already running
    const running = await prisma.deployment.findFirst({
      where: { projectId, status: { in: ['pending', 'building'] } },
    });
    if (running) {
      return res.status(409).json({
        success: false,
        error: 'A deployment is already in progress. Wait for it to complete.',
        deploymentId: running.id,
      });
    }

    const deployment = await deployProject(projectId, req.user.id);

    res.status(202).json({
      success: true,
      message: 'Deployment started. Monitor progress at GET /deployments/:id/logs',
      deployment: {
        id: deployment.id,
        status: deployment.status,
        provider: deployment.provider,
        createdAt: deployment.createdAt,
      },
    });
  } catch (err) {
    console.error('[Deploy] triggerDeploy error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /projects/:projectId/deployments
 * List all deployments for a project.
 */
const listDeployments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const deployments = await getProjectDeployments(projectId);
    res.json({ success: true, data: deployments, count: deployments.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /deployments/:deploymentId
 * Get a single deployment with its latest status.
 */
const getDeployment = async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const deployment = await prisma.deployment.findFirst({
      where: { id: deploymentId, project: { userId: req.user.id } },
      include: { project: { select: { name: true } } },
    });
    if (!deployment) return res.status(404).json({ success: false, error: 'Deployment not found' });
    res.json({ success: true, data: deployment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /deployments/:deploymentId/stop
 * Stop a running deployment.
 */
const stopDeploy = async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const dep = await prisma.deployment.findFirst({
      where: { id: deploymentId, project: { userId: req.user.id } },
    });
    if (!dep) return res.status(404).json({ success: false, error: 'Deployment not found' });
    await stopDeployment(deploymentId);
    res.json({ success: true, message: 'Deployment stopped' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /deployments/:deploymentId/restart
 * Restart a deployment container.
 */
const restartDeploy = async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const dep = await prisma.deployment.findFirst({
      where: { id: deploymentId, project: { userId: req.user.id } },
    });
    if (!dep) return res.status(404).json({ success: false, error: 'Deployment not found' });
    const updated = await restartDeployment(deploymentId);
    res.json({ success: true, message: 'Container restarted', deployment: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /deployments/:deploymentId/logs
 * Get stored deployment logs.
 */
const getDeploymentLogs = async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const dep = await prisma.deployment.findFirst({
      where: { id: deploymentId, project: { userId: req.user.id } },
    });
    if (!dep) return res.status(404).json({ success: false, error: 'Deployment not found' });

    const logs = await getLogs(deploymentId);

    // Also get live container logs if running
    let containerLogs = '';
    if (dep.containerId && dep.status === 'running') {
      containerLogs = await getContainerLogs(dep.containerName || dep.containerId, 50);
    }

    res.json({
      success: true,
      deployment: { id: dep.id, status: dep.status, apiUrl: dep.apiUrl },
      logs,
      containerLogs: containerLogs ? containerLogs.split('\n').filter(Boolean) : [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /deployments/:deploymentId/logs/stream
 * Server-Sent Events stream of real-time deployment logs.
 */
const streamDeploymentLogs = async (req, res) => {
  const { deploymentId } = req.params;

  // Verify ownership
  const dep = await prisma.deployment.findFirst({
    where: { id: deploymentId, project: { userId: req.user.id } },
  }).catch(() => null);
  if (!dep) return res.status(404).json({ success: false, error: 'Deployment not found' });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send existing logs first
  const existing = await getLogs(deploymentId);
  for (const log of existing) {
    res.write(`data: ${JSON.stringify({ level: log.level, message: log.message, timestamp: log.timestamp })}\n\n`);
  }

  // Subscribe to new logs
  subscribe(deploymentId, res);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => clearInterval(heartbeat));
};

/**
 * GET /projects/:projectId/logs
 * Get recent logs across all deployments for a project.
 */
const getProjectLogsHandler = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const logs = await getProjectLogs(projectId, parseInt(req.query.limit || '200'));
    res.json({ success: true, data: logs, count: logs.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  triggerDeploy,
  listDeployments,
  getDeployment,
  stopDeploy,
  restartDeploy,
  getDeploymentLogs,
  streamDeploymentLogs,
  getProjectLogsHandler,
};

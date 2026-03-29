// backend/server/services/containerService.js
// Manages Docker containers for project deployments.
// Uses the dockerode library to communicate with the local Docker daemon.
//
// Each deployed project gets:
//   - A unique container name: stackbase_prj_<shortId>
//   - A mapped host port in the configured range (5000-5999)
//   - DATABASE_URL injected as env var
//   - A generated API URL: http://localhost:<port>

const fs = require('fs');
const path = require('path');

let Docker;
try {
  Docker = require('dockerode');
} catch {
  Docker = null;
}

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
const API_BASE_URL  = process.env.API_BASE_URL || 'http://localhost';
const PORT_START    = parseInt(process.env.CONTAINER_PORT_START || '5000');
const PORT_END      = parseInt(process.env.CONTAINER_PORT_END   || '5999');
const DATABASE_URL  = process.env.DATABASE_URL;

let docker = null;

const getDocker = () => {
  if (!Docker) throw new Error('dockerode not installed. Run: npm install dockerode tar-fs');
  if (!docker) {
    docker = new Docker({ socketPath: DOCKER_SOCKET });
  }
  return docker;
};

/**
 * Check if Docker is available on this machine.
 */
const isDockerAvailable = async () => {
  try {
    const d = getDocker();
    await d.ping();
    return true;
  } catch {
    return false;
  }
};

/**
 * Build a Docker image from a temp directory containing:
 *   server.js, package.json, Dockerfile
 *
 * @param {string} buildContext - Path to directory with project files
 * @param {string} imageName    - Docker image tag e.g. stackbase_prj_abc12345
 * @param {Function} onLog      - Callback for build log lines
 */
const buildImage = async (buildContext, imageName, onLog = () => {}) => {
  const d = getDocker();
  const tar = require('tar-fs');

  const tarStream = tar.pack(buildContext);

  return new Promise((resolve, reject) => {
    d.buildImage(tarStream, { t: imageName }, (err, stream) => {
      if (err) return reject(err);

      d.modem.followProgress(stream, (err, output) => {
        if (err) return reject(err);

        // Check for build errors in output
        const errorLine = output.find((o) => o.error);
        if (errorLine) return reject(new Error(errorLine.error));

        resolve(imageName);
      }, (event) => {
        if (event.stream) onLog(event.stream.trim());
      });
    });
  });
};

/**
 * Find an available host port in the configured range.
 * Checks existing containers to avoid conflicts.
 */
const findAvailablePort = async () => {
  const d = getDocker();
  const containers = await d.listContainers({ all: true });

  const usedPorts = new Set();
  for (const c of containers) {
    for (const p of (c.Ports || [])) {
      if (p.PublicPort) usedPorts.add(p.PublicPort);
    }
  }

  for (let port = PORT_START; port <= PORT_END; port++) {
    if (!usedPorts.has(port)) return port;
  }

  throw new Error(`No available ports in range ${PORT_START}-${PORT_END}`);
};

/**
 * Run a container from a built image.
 *
 * @param {string} imageName
 * @param {string} containerName
 * @param {number} hostPort
 * @returns {Promise<{ containerId: string, port: number, apiUrl: string }>}
 */
const runContainer = async (imageName, containerName, hostPort) => {
  const d = getDocker();

  // Remove existing container with same name if present
  try {
    const existing = d.getContainer(containerName);
    await existing.stop().catch(() => {});
    await existing.remove().catch(() => {});
  } catch {}

  const container = await d.createContainer({
    Image: imageName,
    name: containerName,
    Env: [
      `DATABASE_URL=${DATABASE_URL}`,
      `PORT=8080`,
      `NODE_ENV=production`,
    ],
    ExposedPorts: { '8080/tcp': {} },
    HostConfig: {
      PortBindings: {
        '8080/tcp': [{ HostPort: String(hostPort) }],
      },
      RestartPolicy: { Name: 'unless-stopped' },
      // Resource limits
      Memory: 256 * 1024 * 1024,     // 256 MB
      NanoCpus: 500000000,            // 0.5 CPU
    },
  });

  await container.start();

  return {
    containerId: container.id,
    port: hostPort,
    apiUrl: `${API_BASE_URL}:${hostPort}`,
  };
};

/**
 * Stop and remove a container by ID or name.
 * @param {string} containerIdOrName
 */
const stopContainer = async (containerIdOrName) => {
  const d = getDocker();
  const container = d.getContainer(containerIdOrName);
  await container.stop().catch(() => {});
  await container.remove({ force: true }).catch(() => {});
};

/**
 * Restart a container.
 * @param {string} containerIdOrName
 */
const restartContainer = async (containerIdOrName) => {
  const d = getDocker();
  const container = d.getContainer(containerIdOrName);
  await container.restart();
};

/**
 * Get the status of a container.
 * @param {string} containerIdOrName
 * @returns {Promise<'running'|'stopped'|'not_found'>}
 */
const getContainerStatus = async (containerIdOrName) => {
  try {
    const d = getDocker();
    const container = d.getContainer(containerIdOrName);
    const info = await container.inspect();
    return info.State.Running ? 'running' : 'stopped';
  } catch {
    return 'not_found';
  }
};

/**
 * Get recent logs from a container.
 * @param {string} containerIdOrName
 * @param {number} tail - Number of lines
 * @returns {Promise<string>}
 */
const getContainerLogs = async (containerIdOrName, tail = 100) => {
  try {
    const d = getDocker();
    const container = d.getContainer(containerIdOrName);
    const logsBuffer = await container.logs({
      stdout: true, stderr: true,
      tail,
      timestamps: true,
    });
    // Docker multiplexes stdout/stderr — decode
    return logsBuffer.toString('utf8').replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
  } catch {
    return '';
  }
};

/**
 * Remove a Docker image.
 * @param {string} imageName
 */
const removeImage = async (imageName) => {
  try {
    const d = getDocker();
    const image = d.getImage(imageName);
    await image.remove({ force: true });
  } catch {}
};

module.exports = {
  isDockerAvailable,
  buildImage,
  findAvailablePort,
  runContainer,
  stopContainer,
  restartContainer,
  getContainerStatus,
  getContainerLogs,
  removeImage,
};

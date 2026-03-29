// backend/server/services/logService.js
// Persists deployment log entries to the database.
// Also provides Server-Sent Events (SSE) streaming for real-time log tailing.

const prisma = require('../../config/prisma');

// In-memory SSE subscribers: deploymentId -> Set<res>
const subscribers = new Map();

/**
 * Append a log entry to a deployment.
 * Also broadcasts to any SSE subscribers watching this deployment.
 *
 * @param {string} deploymentId
 * @param {string} message
 * @param {'info'|'warn'|'error'|'success'} level
 */
const appendLog = async (deploymentId, message, level = 'info') => {
  // Clean ANSI escape codes from Docker build output
  const clean = message.replace(/\x1B\[[0-9;]*[mGKHF]/g, '').trim();
  if (!clean) return;

  try {
    await prisma.deploymentLog.create({
      data: { deploymentId, message: clean, level },
    });
  } catch {}

  // Broadcast to SSE subscribers
  broadcast(deploymentId, { level, message: clean, timestamp: new Date().toISOString() });
};

/**
 * Get all logs for a deployment.
 */
const getLogs = async (deploymentId) => {
  return prisma.deploymentLog.findMany({
    where: { deploymentId },
    orderBy: { timestamp: 'asc' },
  });
};

/**
 * Get recent logs for a project (across all deployments).
 */
const getProjectLogs = async (projectId, limit = 200) => {
  return prisma.deploymentLog.findMany({
    where: { deployment: { projectId } },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: { deployment: { select: { id: true, status: true } } },
  });
};

// ── SSE Streaming ─────────────────────────────────────────────────────────────

/**
 * Subscribe an SSE response object to a deployment's log stream.
 */
const subscribe = (deploymentId, res) => {
  if (!subscribers.has(deploymentId)) {
    subscribers.set(deploymentId, new Set());
  }
  subscribers.get(deploymentId).add(res);

  // Clean up on client disconnect
  res.on('close', () => unsubscribe(deploymentId, res));
};

const unsubscribe = (deploymentId, res) => {
  subscribers.get(deploymentId)?.delete(res);
};

const broadcast = (deploymentId, data) => {
  const subs = subscribers.get(deploymentId);
  if (!subs || subs.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of subs) {
    try { res.write(payload); } catch {}
  }
};

module.exports = { appendLog, getLogs, getProjectLogs, subscribe, unsubscribe };

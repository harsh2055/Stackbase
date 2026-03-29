// backend/server/services/apiKeyService.js
// Generates and validates project-scoped API keys.
// Keys are in format: pk_live_<32 random hex chars>

const crypto = require('crypto');
const prisma = require('../../config/prisma');

/**
 * Generate a new API key string.
 * Format: pk_live_<32 hex chars>
 * @returns {string}
 */
const generateApiKey = () => {
  const random = crypto.randomBytes(20).toString('hex');
  return `pk_live_${random}`;
};

/**
 * Create and persist a new API key for a project.
 * @param {string} projectId
 * @param {string} userId
 * @param {string} name  - Human-readable name for the key
 * @returns {Promise<ApiKey>}
 */
const createApiKey = async (projectId, userId, name = 'Default Key') => {
  const key = generateApiKey();
  return prisma.apiKey.create({
    data: { projectId, userId, key, name },
  });
};

/**
 * Validate an API key from a request.
 * Returns the key record (with project) if valid, null otherwise.
 * Also updates lastUsed timestamp.
 * @param {string} rawKey
 * @returns {Promise<ApiKey & { project: Project } | null>}
 */
const validateApiKey = async (rawKey) => {
  if (!rawKey) return null;

  const record = await prisma.apiKey.findUnique({
    where: { key: rawKey },
    include: { project: true },
  });

  if (!record) return null;

  // Update last used timestamp (fire and forget)
  prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsed: new Date() },
  }).catch(() => {});

  return record;
};

/**
 * List all API keys for a project.
 * Never returns the raw key value — only masked versions.
 * @param {string} projectId
 * @returns {Promise<Array>}
 */
const listApiKeys = async (projectId) => {
  const keys = await prisma.apiKey.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    keyMasked: `${k.key.slice(0, 12)}...${k.key.slice(-4)}`,
    lastUsed: k.lastUsed,
    createdAt: k.createdAt,
  }));
};

/**
 * Revoke (delete) an API key.
 * @param {string} keyId
 * @param {string} userId - Must own the key
 */
const revokeApiKey = async (keyId, userId) => {
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, userId },
  });
  if (!key) throw new Error('API key not found or access denied');
  await prisma.apiKey.delete({ where: { id: keyId } });
};

module.exports = { generateApiKey, createApiKey, validateApiKey, listApiKeys, revokeApiKey };

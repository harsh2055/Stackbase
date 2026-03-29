// backend/server/controllers/apiKeyController.js
// Manages API keys for a project.
// Keys are used by external apps to access the generated data APIs.

const prisma = require('../../config/prisma');
const { createApiKey, listApiKeys, revokeApiKey } = require('../services/apiKeyService');

/**
 * POST /projects/:projectId/keys
 * Generate a new API key for a project.
 * Returns the full key ONCE — it cannot be retrieved again.
 *
 * Body: { name? }
 */
const generateKey = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name = 'New Key' } = req.body;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Limit to 5 keys per project
    const keyCount = await prisma.apiKey.count({ where: { projectId } });
    if (keyCount >= 5) {
      return res.status(400).json({
        success: false,
        error: 'Maximum of 5 API keys per project. Revoke an existing key first.',
      });
    }

    const apiKey = await createApiKey(projectId, req.user.id, name);

    res.status(201).json({
      success: true,
      message: 'API key generated. Save it now — it will not be shown again.',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Full key shown ONLY on creation
        createdAt: apiKey.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /projects/:projectId/keys
 * List all API keys for a project (masked).
 */
const listKeys = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const keys = await listApiKeys(projectId);
    res.json({ success: true, data: keys, count: keys.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /projects/:projectId/keys/:keyId
 * Revoke an API key.
 */
const revokeKey = async (req, res) => {
  try {
    const { projectId, keyId } = req.params;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    await revokeApiKey(keyId, req.user.id);
    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { generateKey, listKeys, revokeKey };

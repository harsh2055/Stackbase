// backend/server/middleware/apiKeyMiddleware.js
// Validates project API keys for accessing dynamic table data APIs.
// API keys are passed in the Authorization header as: Bearer pk_live_xxxxx
// or via the x-api-key header.
// On success: attaches req.apiKeyRecord and req.project

const { validateApiKey } = require('../services/apiKeyService');
const { extractToken } = require('../services/authService');

/**
 * requireApiKey middleware
 * Accepts API key via:
 *   - Authorization: Bearer pk_live_xxxx
 *   - x-api-key: pk_live_xxxx
 *
 * On success: req.apiKeyRecord and req.project are set
 */
const requireApiKey = async (req, res, next) => {
  try {
    // Try x-api-key header first, then Authorization header
    const rawKey =
      req.headers['x-api-key'] ||
      extractToken(req.headers.authorization);

    if (!rawKey || !rawKey.startsWith('pk_live_')) {
      return res.status(401).json({
        success: false,
        error: 'Valid API key required. Provide x-api-key header or Bearer pk_live_xxx token.',
      });
    }

    const keyRecord = await validateApiKey(rawKey);

    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or revoked API key',
      });
    }

    req.apiKeyRecord = keyRecord;
    req.project = keyRecord.project;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * optionalApiKey — attaches project context if key present, but doesn't block.
 * Useful for endpoints that support both authenticated and public access.
 */
const optionalApiKey = async (req, res, next) => {
  try {
    const rawKey =
      req.headers['x-api-key'] ||
      extractToken(req.headers.authorization);

    if (rawKey && rawKey.startsWith('pk_live_')) {
      const keyRecord = await validateApiKey(rawKey);
      if (keyRecord) {
        req.apiKeyRecord = keyRecord;
        req.project = keyRecord.project;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireApiKey, optionalApiKey };

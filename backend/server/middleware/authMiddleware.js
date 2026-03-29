// backend/server/middleware/authMiddleware.js
// Protects routes by verifying the JWT in the Authorization header.
// Attaches the decoded user payload to req.user.

const { verifyToken, extractToken } = require('../services/authService');
// Note: We intentionally do NOT query the DB here.
// JWT payload is trusted directly to avoid a Supabase round-trip on every request.

/**
 * requireAuth middleware
 * Expects: Authorization: Bearer <jwt>
 * On success: attaches req.user = { id, email, role }
 * On failure: 401
 */
const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Provide a Bearer token.',
      });
    }

    // Verify + decode the JWT. The payload already contains id, email, role
    // signed at login time — we trust it without a DB round-trip.
    // This avoids a Supabase connection on EVERY authenticated request,
    // which was causing 500s whenever the free-tier pool was busy/sleeping.
    const decoded = verifyToken(token);

    req.user = {
      id:    decoded.id,
      email: decoded.email,
      name:  decoded.name  || null,
      role:  decoded.role  || 'developer',
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }
    next(err);
  }
};

/**
 * requireAdmin middleware
 * Must be used AFTER requireAuth.
 * Rejects non-admin users with 403.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };

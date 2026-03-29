// backend/server/services/authService.js
// Handles password hashing and JWT token operations.
// All auth logic lives here — controllers stay thin.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

// ── Password ──────────────────────────────────────────────────────────────────

/**
 * Hash a plain-text password.
 * @param {string} password
 * @returns {Promise<string>} bcrypt hash
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Compare a plain-text password against a stored hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// ── JWT ───────────────────────────────────────────────────────────────────────

/**
 * Sign a JWT for a user.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {string} signed JWT
 */
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {{ id: string, email: string, role: string, iat: number, exp: number }}
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Extract token from Authorization header.
 * Supports: "Bearer <token>"
 * @param {string} authHeader
 * @returns {string|null}
 */
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1] || null;
};

module.exports = { hashPassword, comparePassword, signToken, verifyToken, extractToken };

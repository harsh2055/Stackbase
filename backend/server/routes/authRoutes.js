// backend/server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, getProfile, updateProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Rate limit auth endpoints — 20 requests per 15 min per IP
// Note: app.set('trust proxy', 1) must be set in server.js for this to work on Render
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many requests. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
});

// POST /auth/register
router.post('/register', authLimiter, register);

// POST /auth/login
router.post('/login', authLimiter, login);

// GET /auth/profile — requires auth
router.get('/profile', requireAuth, getProfile);

// PUT /auth/profile — requires auth
router.put('/profile', requireAuth, updateProfile);

module.exports = router;

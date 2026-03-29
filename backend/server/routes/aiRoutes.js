// backend/server/routes/aiRoutes.js
// Phase 5 — AI Backend Generator routes

'use strict';

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/authMiddleware');
const { generateBackend, confirmBackend, getHistory, getSamples } = require('../controllers/aiController');

// Rate limit AI generation — expensive API calls, limit to 20/hour per user
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, error: 'AI generation limit reached. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// GET /ai/prompts — sample prompts (no auth needed)
router.get('/prompts', getSamples);

// All AI generation routes require authentication
router.use(requireAuth);

// ------------------------------------------------------------------
// IMPORTANT: Since this router is mounted at '/ai' in server.js,
// the full paths for these will be: /ai/:projectId/generate
// ------------------------------------------------------------------

// POST /ai/:projectId/generate — Step 1: generate schema from prompt
router.post('/:projectId/generate', aiLimiter, generateBackend);

// POST /ai/:projectId/confirm  — Step 2: apply schema + optional deploy
router.post('/:projectId/confirm', confirmBackend);

// GET  /ai/:projectId/history  — list past AI requests
router.get('/:projectId/history', getHistory);

module.exports = router;
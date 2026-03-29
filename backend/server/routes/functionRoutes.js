// backend/server/routes/functionRoutes.js
// Phase 7 — Serverless Functions routes

'use strict';

const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  createFunction, listFunctions, getFunction,
  updateFunction, deleteFunction,
  executeFunction, getFunctionLogs,
} = require('../controllers/functionController');

router.use(requireAuth);

// Function CRUD
router.post('/',                      createFunction);
router.get('/',                       listFunctions);
router.get('/:functionId',            getFunction);
router.put('/:functionId',            updateFunction);
router.delete('/:functionId',         deleteFunction);

// Execution & logs
router.post('/:functionId/execute',   executeFunction);
router.get('/:functionId/logs',       getFunctionLogs);

module.exports = router;

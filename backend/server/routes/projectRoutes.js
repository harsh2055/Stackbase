// backend/server/routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { createProject, listProjects, getProject, updateProject, deleteProject } = require('../controllers/projectController');
const { generateKey, listKeys, revokeKey } = require('../controllers/apiKeyController');
const { createProjectTable, listProjectTables, deleteProjectTable } = require('../controllers/projectTableController');
const { triggerDeploy, listDeployments, getProjectLogsHandler } = require('../controllers/deploymentController');

router.use(requireAuth);

// Project CRUD
router.post('/',             createProject);
router.get('/',              listProjects);
router.get('/:projectId',    getProject);
router.put('/:projectId',    updateProject);
router.delete('/:projectId', deleteProject);

// API Keys
router.post('/:projectId/keys',          generateKey);
router.get('/:projectId/keys',           listKeys);
router.delete('/:projectId/keys/:keyId', revokeKey);

// Tables
router.post('/:projectId/tables',              createProjectTable);
router.get('/:projectId/tables',               listProjectTables);
router.delete('/:projectId/tables/:tableName', deleteProjectTable);

// Deployments (project-scoped)
router.post('/:projectId/deployments', triggerDeploy);
router.get('/:projectId/deployments',  listDeployments);
router.get('/:projectId/logs',         getProjectLogsHandler);

module.exports = router;

// ── AI Backend Generator (Phase 5) ────────────────────────────────────────────
const rateLimit = require('express-rate-limit');
const { generateBackend, confirmBackend, getHistory } = require('../controllers/aiController');

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'AI generation limit reached. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

router.post('/:projectId/ai/generate', aiLimiter, generateBackend);
router.post('/:projectId/ai/confirm',            confirmBackend);
router.get('/:projectId/ai/history',             getHistory);

// ── Serverless Functions (Phase 7) ────────────────────────────────────────────
const {
  createFunction, listFunctions, getFunction,
  updateFunction, deleteFunction,
  executeFunction: execFn, getFunctionLogs,
} = require('../controllers/functionController');

router.post('/:projectId/functions',                            createFunction);
router.get('/:projectId/functions',                             listFunctions);
router.get('/:projectId/functions/:functionId',                 getFunction);
router.put('/:projectId/functions/:functionId',                 updateFunction);
router.delete('/:projectId/functions/:functionId',              deleteFunction);
router.post('/:projectId/functions/:functionId/execute',        execFn);
router.get('/:projectId/functions/:functionId/logs',            getFunctionLogs);

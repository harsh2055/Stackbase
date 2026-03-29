// backend/server/routes/deploymentRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  triggerDeploy, listDeployments, getDeployment,
  stopDeploy, restartDeploy,
  getDeploymentLogs, streamDeploymentLogs,
  getProjectLogsHandler,
} = require('../controllers/deploymentController');

router.use(requireAuth);

// Project-scoped deployment actions
router.post('/:projectId/deployments',  triggerDeploy);
router.get('/:projectId/deployments',   listDeployments);
router.get('/:projectId/logs',          getProjectLogsHandler);

module.exports = router;

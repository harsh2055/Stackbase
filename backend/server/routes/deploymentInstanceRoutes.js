// backend/server/routes/deploymentInstanceRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getDeployment, stopDeploy, restartDeploy,
  getDeploymentLogs, streamDeploymentLogs,
} = require('../controllers/deploymentController');

router.use(requireAuth);

router.get('/:deploymentId',              getDeployment);
router.post('/:deploymentId/stop',        stopDeploy);
router.post('/:deploymentId/restart',     restartDeploy);
router.get('/:deploymentId/logs',         getDeploymentLogs);
router.get('/:deploymentId/logs/stream',  streamDeploymentLogs);

module.exports = router;

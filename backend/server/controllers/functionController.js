// backend/server/controllers/functionController.js
// Phase 7 — Serverless Functions HTTP handlers

'use strict';

const prisma = require('../../config/prisma');
const functionService = require('../services/functionService');

/**
 * POST /projects/:projectId/functions
 * Create a new serverless function.
 */
const createFunction = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user.id } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const fn = await functionService.createFunction(projectId, req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: `Function "${fn.name}" created`,
      function: fn,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * GET /projects/:projectId/functions
 * List all functions for a project.
 */
const listFunctions = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user.id } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const functions = await prisma.function.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { logs: true } },
      },
    });

    res.json({ success: true, data: functions, count: functions.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /projects/:projectId/functions/:functionId
 * Get a single function with its recent logs.
 */
const getFunction = async (req, res) => {
  try {
    const { projectId, functionId } = req.params;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user.id } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const fn = await prisma.function.findFirst({
      where: { id: functionId, projectId },
      include: {
        logs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!fn) return res.status(404).json({ success: false, error: 'Function not found' });

    res.json({ success: true, data: fn });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /projects/:projectId/functions/:functionId
 * Update a function's code or config.
 */
const updateFunction = async (req, res) => {
  try {
    const { projectId, functionId } = req.params;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user.id } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const existing = await prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Function not found' });

    const fn = await functionService.updateFunction(functionId, projectId, req.body);
    res.json({ success: true, function: fn });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /projects/:projectId/functions/:functionId
 * Delete a function.
 */
const deleteFunction = async (req, res) => {
  try {
    const { projectId, functionId } = req.params;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user.id } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    await functionService.deleteFunction(functionId, projectId);
    res.json({ success: true, message: 'Function deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * POST /projects/:projectId/functions/:functionId/execute
 * Manually execute a function with a custom event payload.
 * Useful for testing functions from the dashboard.
 */
const executeFunction = async (req, res) => {
  try {
    const { projectId, functionId } = req.params;
    const { event = {} } = req.body;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user.id } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const fn = await prisma.function.findFirst({ where: { id: functionId, projectId } });
    if (!fn) return res.status(404).json({ success: false, error: 'Function not found' });

    const log = await functionService.executeAndLog(fn, {
      ...event,
      _manual: true,
      timestamp: new Date().toISOString(),
    }, 'manual');

    res.json({
      success: true,
      execution: log,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /projects/:projectId/functions/:functionId/logs
 * Get execution logs for a function.
 */
const getFunctionLogs = async (req, res) => {
  try {
    const { projectId, functionId } = req.params;
    const limit = parseInt(req.query.limit || '50');

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user.id } });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const logs = await functionService.getFunctionLogs(functionId, projectId, limit);
    res.json({ success: true, data: logs, count: logs.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /functions/:projectId/:httpPath
 * HTTP trigger — execute a function via HTTP POST.
 * This is the public-facing endpoint for http-triggered functions.
 */
const handleHttpTrigger = async (req, res) => {
  try {
    const { projectId, httpPath } = req.params;

    const fn = await prisma.function.findFirst({
      where: {
        projectId,
        triggerType: 'http',
        httpPath: `/${httpPath}`,
        enabled: true,
      },
    });

    if (!fn) {
      return res.status(404).json({ success: false, error: `No http function found at /${httpPath}` });
    }

    const event = {
      method:  req.method,
      path:    req.path,
      query:   req.query,
      body:    req.body,
      headers: req.headers,
      timestamp: new Date().toISOString(),
    };

    const log = await functionService.executeAndLog(fn, event, `http:${req.method}:/${httpPath}`);

    res.json({
      success: log.status === 'success',
      output:  log.output ? log.output.split('\n') : [],
      error:   log.error || null,
      duration: log.duration,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createFunction, listFunctions, getFunction,
  updateFunction, deleteFunction,
  executeFunction, getFunctionLogs,
  handleHttpTrigger,
};

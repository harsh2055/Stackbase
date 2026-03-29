// server/routes/systemRoutes.js
// System-level endpoints: health check, API explorer, supported types.

const express = require('express');
const router = express.Router();
const routeRegistry = require('./routeRegistry');
const { getSupportedTypes } = require('../generators/typeMapper');
const prisma = require('../../config/prisma');
const { pool } = require('../../config/db');

/**
 * GET /health
 * Health check endpoint. Returns server and DB status.
 */
router.get('/health', async (req, res) => {
  let dbStatus = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    status: 'ok',
    server: 'running',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    phase: 'Phase 1 — Core Backend Engine',
  });
});

/**
 * GET /api/explorer
 * Returns a complete map of all registered dynamic APIs.
 * Useful for frontend dashboards to display available endpoints.
 */
router.get('/explorer', async (req, res) => {
  try {
    const tables = routeRegistry.getRegisteredTables();
    const schemas = await prisma.tableSchema.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const schemaMap = {};
    schemas.forEach((s) => { schemaMap[s.tableName] = s; });

    const endpoints = tables.map((tableName) => ({
      table: tableName,
      schema: schemaMap[tableName]?.columns || [],
      routes: [
        { method: 'GET',    path: `/api/${tableName}`,     description: 'List all records' },
        { method: 'GET',    path: `/api/${tableName}/:id`, description: 'Get record by id' },
        { method: 'POST',   path: `/api/${tableName}`,     description: 'Create record' },
        { method: 'PUT',    path: `/api/${tableName}/:id`, description: 'Update record' },
        { method: 'DELETE', path: `/api/${tableName}/:id`, description: 'Delete record' },
      ],
    }));

    res.json({
      success: true,
      platform: 'Stackbase',
      phase: 'Phase 1 — Core Backend Engine',
      totalTables: tables.length,
      totalEndpoints: tables.length * 5,
      apis: endpoints,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/types
 * Returns all supported column types.
 */
router.get('/types', (req, res) => {
  res.json({
    success: true,
    supportedTypes: getSupportedTypes(),
  });
});

/**
 * GET /realtime/stats
 * Returns WebSocket subscription stats.
 */
router.get('/realtime/stats', (req, res) => {
  try {
    const subscriptionManager = require('../realtime/subscriptionManager');
    const { getWss } = require('../realtime/websocketServer');
    const wss = getWss();
    res.json({
      success: true,
      connected: wss ? wss.clients.size : 0,
      ...subscriptionManager.getStats(),
    });
  } catch {
    res.json({ success: true, connected: 0, totalClients: 0, totalSubscriptions: 0, tables: {} });
  }
});

module.exports = router;

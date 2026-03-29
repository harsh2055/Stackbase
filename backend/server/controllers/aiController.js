// backend/server/controllers/aiController.js
// Phase 5 — AI Backend Generator HTTP handlers
//
// Flow:
//   1. POST /projects/:id/ai/generate  → call Claude, return schema preview
//   2. POST /projects/:id/ai/confirm   → create tables + deploy
//   3. GET  /projects/:id/ai/history   → list past AI requests

'use strict';

const prisma = require('../../config/prisma');
const { generateSchema, getSamplePrompts } = require('../services/aiService');
const { validateAndCleanSchema, buildPreviewSummary } = require('../services/schemaGeneratorService');
const { createProjectTable } = require('./projectTableController');
const { deployProject } = require('../services/deploymentService');

/**
 * POST /projects/:projectId/ai/generate
 *
 * Step 1: Send prompt to Claude, validate response, return schema preview.
 * Does NOT create any tables yet — user must confirm in step 2.
 *
 * Body: { prompt: string }
 */
const generateBackend = async (req, res) => {
  const { projectId } = req.params;
  const { prompt } = req.body;

  if (!prompt || prompt.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Prompt must be at least 10 characters. Describe your application.',
    });
  }

  if (prompt.length > 2000) {
    return res.status(400).json({
      success: false,
      error: 'Prompt must be under 2000 characters.',
    });
  }

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.user.id },
  });
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Create a pending AI request record
  const aiRequest = await prisma.aiRequest.create({
    data: {
      projectId,
      userId: req.user.id,
      prompt: prompt.trim(),
      status: 'pending',
    },
  });

  try {
    console.log(`[AI] Generating schema for project "${project.name}" — prompt: "${prompt.slice(0, 80)}..."`);

    // Call Claude
    const rawSchema = await generateSchema(prompt);

    // Validate and clean
    const cleanSchema = validateAndCleanSchema(rawSchema);

    if (cleanSchema.tables.length === 0) {
      await prisma.aiRequest.update({
        where: { id: aiRequest.id },
        data: { status: 'failed', errorMessage: 'AI generated no valid tables' },
      });
      return res.status(422).json({
        success: false,
        error: 'AI could not generate a valid schema from that prompt. Try being more specific.',
        warnings: cleanSchema.warnings,
      });
    }

    // Save generated schema to the request record
    await prisma.aiRequest.update({
      where: { id: aiRequest.id },
      data: {
        generatedSchema: cleanSchema,
        status: 'completed',
      },
    });

    const preview = buildPreviewSummary(cleanSchema);

    res.json({
      success: true,
      message: `AI generated ${cleanSchema.tables.length} table(s). Review and confirm to create them.`,
      requestId: aiRequest.id,
      schema: cleanSchema,
      preview,
      warnings: cleanSchema.warnings,
      estimatedApis: cleanSchema.tables.length * 5,
    });

  } catch (err) {
    console.error('[AI] Generation error:', err.message);

    await prisma.aiRequest.update({
      where: { id: aiRequest.id },
      data: { status: 'failed', errorMessage: err.message },
    }).catch(() => {});

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * POST /projects/:projectId/ai/confirm
 *
 * Step 2: User confirms the generated schema.
 * Creates all tables and optionally triggers deployment.
 *
 * Body: { requestId: string, autoDeploy?: boolean }
 */
const confirmBackend = async (req, res) => {
  const { projectId } = req.params;
  const { requestId, autoDeploy = false } = req.body;

  if (!requestId) {
    return res.status(400).json({ success: false, error: 'requestId is required' });
  }

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.user.id },
  });
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

  // Load the AI request
  const aiRequest = await prisma.aiRequest.findFirst({
    where: { id: requestId, projectId, userId: req.user.id },
  });
  if (!aiRequest) {
    return res.status(404).json({ success: false, error: 'AI request not found' });
  }
  if (aiRequest.status !== 'completed' || !aiRequest.generatedSchema) {
    return res.status(400).json({ success: false, error: 'AI request is not ready or has no schema' });
  }
  if (aiRequest.tablesCreated > 0) {
    return res.status(409).json({ success: false, error: 'This schema has already been applied' });
  }

  const schema = aiRequest.generatedSchema;
  const created = [];
  const errors  = [];

  // Create each table using the existing projectTableController logic
  // We call the service layer directly instead of going through HTTP
  for (const table of schema.tables) {
    try {
      await createTableDirect(projectId, table, req.user.id);
      created.push(table.name);
      console.log(`[AI] Created table "${table.name}" in project "${project.name}"`);
    } catch (err) {
      errors.push({ table: table.name, error: err.message });
      console.error(`[AI] Failed to create table "${table.name}":`, err.message);
    }
  }

  // Update the AI request with results
  await prisma.aiRequest.update({
    where: { id: aiRequest.id },
    data: { tablesCreated: created.length },
  });

  // Auto-deploy if requested and at least one table was created
  let deployment = null;
  if (autoDeploy && created.length > 0) {
    try {
      deployment = await deployProject(projectId, req.user.id);
      await prisma.aiRequest.update({
        where: { id: aiRequest.id },
        data: { deployed: true },
      });
    } catch (err) {
      console.error('[AI] Auto-deploy failed:', err.message);
    }
  }

  res.status(201).json({
    success: true,
    message: `Created ${created.length} table(s) with ${created.length * 5} CRUD APIs`,
    created,
    errors,
    generatedApis: created.length * 5,
    deployment: deployment ? { id: deployment.id, status: deployment.status } : null,
  });
};

/**
 * GET /projects/:projectId/ai/history
 * List all AI requests for a project.
 */
const getHistory = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const requests = await prisma.aiRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        prompt: true,
        status: true,
        tablesCreated: true,
        deployed: true,
        errorMessage: true,
        createdAt: true,
        generatedSchema: true,
      },
    });

    res.json({ success: true, data: requests, count: requests.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /ai/prompts
 * Return sample prompts for the UI.
 */
const getSamples = (req, res) => {
  res.json({ success: true, prompts: getSamplePrompts() });
};

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Create a table directly via service layer (bypasses HTTP layer).
 * Reuses existing SQL generation + route registration logic.
 */
const createTableDirect = async (projectId, table, userId) => {
  const prismaClient = require('../../config/prisma');
  const { query } = require('../../config/db');
  const { generateCreateTableSQL, sanitizeIdentifier } = require('../generators/sqlGenerator');
  const routeRegistry = require('../routes/routeRegistry');
  const { buildPgTableName } = require('./projectTableController');

  const safeTableName = sanitizeIdentifier(table.name);
  const pgTableName   = buildPgTableName(projectId, safeTableName);

  // Check for duplicates
  const existing = await prismaClient.projectTable.findUnique({
    where: { projectId_tableName: { projectId, tableName: safeTableName } },
  });
  if (existing) throw new Error(`Table "${safeTableName}" already exists in this project`);

  // Generate + execute DDL
  const sql = generateCreateTableSQL(pgTableName, table.columns);
  await query(sql);

  // Build full schema with auto-added columns
  const fullSchema = [
    { name: 'id', type: 'uuid', nullable: false, isPrimary: true },
    ...table.columns.map((c) => ({
      name:     sanitizeIdentifier(c.name),
      type:     c.type,
      nullable: c.nullable !== false,
      unique:   c.unique === true,
    })),
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ];

  // Save to project_tables
  await prismaClient.projectTable.create({
    data: { projectId, tableName: safeTableName, columns: fullSchema },
  });

  // Register live routes immediately
  routeRegistry.registerTable(pgTableName);
};

module.exports = { generateBackend, confirmBackend, getHistory, getSamples };

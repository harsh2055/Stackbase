// backend/server/controllers/projectTableController.js
// Manages tables within a specific project.
// Tables are namespaced per project: actual PG table name = prj_<shortId>_<tableName>
// This ensures complete isolation between projects.

const prisma = require('../../config/prisma');
const { query } = require('../../config/db');
const { generateCreateTableSQL, generateDropTableSQL, sanitizeIdentifier } = require('../generators/sqlGenerator');
const { isValidType, getSupportedTypes } = require('../generators/typeMapper');
const routeRegistry = require('../routes/routeRegistry');

/**
 * Build the actual PostgreSQL table name for a project-scoped table.
 * Uses first 8 chars of project ID to keep names short.
 * e.g. project abc12345, table "cars" => prj_abc12345_cars
 */
const buildPgTableName = (projectId, tableName) => {
  const shortId = projectId.replace(/-/g, '').slice(0, 8);
  return `prj_${shortId}_${sanitizeIdentifier(tableName)}`;
};

/**
 * POST /projects/:projectId/tables
 * Create a new table inside a project.
 */
const createProjectTable = async (req, res) => {
  const { projectId } = req.params;
  const { tableName, columns } = req.body;

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.user.id },
  });
  if (!project) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }

  // Validate inputs
  if (!tableName?.trim()) {
    return res.status(400).json({ success: false, error: 'tableName is required' });
  }
  if (!Array.isArray(columns) || columns.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one column is required' });
  }
  for (const col of columns) {
    if (!col.name || !col.type) {
      return res.status(400).json({ success: false, error: `Column missing name or type: ${JSON.stringify(col)}` });
    }
    if (!isValidType(col.type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type "${col.type}". Supported: ${getSupportedTypes().join(', ')}`,
      });
    }
  }

  let safeTableName;
  try { safeTableName = sanitizeIdentifier(tableName); } catch (e) {
    return res.status(400).json({ success: false, error: e.message });
  }

  // Check duplicate within this project
  const existing = await prisma.projectTable.findUnique({
    where: { projectId_tableName: { projectId, tableName: safeTableName } },
  });
  if (existing) {
    return res.status(409).json({ success: false, error: `Table "${safeTableName}" already exists in this project` });
  }

  // Build namespaced PG table name
  const pgTableName = buildPgTableName(projectId, safeTableName);

  // Generate + execute DDL
  let sql;
  try { sql = generateCreateTableSQL(pgTableName, columns); } catch (e) {
    return res.status(400).json({ success: false, error: e.message });
  }

  try {
    await query(sql);
  } catch (err) {
    return res.status(500).json({ success: false, error: `DDL failed: ${err.message}` });
  }

  // Save metadata
  const fullSchema = [
    { name: 'id', type: 'uuid', nullable: false, isPrimary: true },
    ...columns.map((c) => ({
      name: sanitizeIdentifier(c.name),
      type: c.type,
      nullable: c.nullable ?? true,
      unique: c.unique ?? false,
    })),
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ];

  const tableRecord = await prisma.projectTable.create({
    data: { projectId, tableName: safeTableName, columns: fullSchema },
  });

  // Register dynamic routes for pgTableName
  routeRegistry.registerTable(pgTableName);

  const generatedApis = [
    { method: 'GET',    endpoint: `/api/${pgTableName}` },
    { method: 'GET',    endpoint: `/api/${pgTableName}/:id` },
    { method: 'POST',   endpoint: `/api/${pgTableName}` },
    { method: 'PUT',    endpoint: `/api/${pgTableName}/:id` },
    { method: 'DELETE', endpoint: `/api/${pgTableName}/:id` },
  ];

  res.status(201).json({
    success: true,
    message: `Table "${safeTableName}" created`,
    table: tableRecord,
    pgTableName,
    generatedApis,
  });
};

/**
 * GET /projects/:projectId/tables
 * List all tables in a project.
 */
const listProjectTables = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const tables = await prisma.projectTable.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    const result = tables.map((t) => ({
      ...t,
      pgTableName: buildPgTableName(projectId, t.tableName),
      generatedApis: [
        `GET    /api/${buildPgTableName(projectId, t.tableName)}`,
        `POST   /api/${buildPgTableName(projectId, t.tableName)}`,
        `PUT    /api/${buildPgTableName(projectId, t.tableName)}/:id`,
        `DELETE /api/${buildPgTableName(projectId, t.tableName)}/:id`,
      ],
    }));

    res.json({ success: true, data: result, count: result.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /projects/:projectId/tables/:tableName
 * Drop a project table.
 */
const deleteProjectTable = async (req, res) => {
  try {
    const { projectId, tableName } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const safeTableName = sanitizeIdentifier(tableName);
    const tableRecord = await prisma.projectTable.findUnique({
      where: { projectId_tableName: { projectId, tableName: safeTableName } },
    });
    if (!tableRecord) return res.status(404).json({ success: false, error: 'Table not found' });

    const pgTableName = buildPgTableName(projectId, safeTableName);
    const dropSQL = generateDropTableSQL(pgTableName);
    await query(dropSQL);

    await prisma.projectTable.delete({
      where: { projectId_tableName: { projectId, tableName: safeTableName } },
    });

    res.json({ success: true, message: `Table "${safeTableName}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { createProjectTable, listProjectTables, deleteProjectTable, buildPgTableName };

// backend/server/controllers/projectController.js
// Manages user projects. Each project is an isolated backend workspace
// with its own tables, APIs, and API keys.

const prisma = require('../../config/prisma');
const { createApiKey } = require('../services/apiKeyService');

/**
 * POST /projects
 * Create a new project for the authenticated user.
 * Automatically generates a default API key.
 *
 * Body: { name, description? }
 */
const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: req.user.id,
      },
    });

    // Auto-generate a default API key for this project
    const apiKey = await createApiKey(project.id, req.user.id, 'Default Key');

    res.status(201).json({
      success: true,
      message: `Project "${project.name}" created`,
      project,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Return full key only on creation
      },
    });
  } catch (err) {
    console.error('[Project] createProject error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /projects
 * List all projects for the authenticated user, with table and key counts.
 */
const listProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { tables: true, apiKeys: true },
        },
      },
    });

    const result = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tableCount: p._count.tables,
      apiKeyCount: p._count.apiKeys,
    }));

    res.json({ success: true, data: result, count: result.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /projects/:projectId
 * Get a single project with its tables, relationships, and API keys.
 */
const getProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
      include: {
        tables: { orderBy: { createdAt: 'asc' } },
        relationships: { orderBy: { createdAt: 'asc' } },
        apiKeys: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, name: true, key: true,
            lastUsed: true, createdAt: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Mask API keys
    const maskedProject = {
      ...project,
      apiKeys: project.apiKeys.map((k) => ({
        ...k,
        keyMasked: `${k.key.slice(0, 12)}...${k.key.slice(-4)}`,
        key: undefined,
      })),
    };

    res.json({ success: true, data: maskedProject });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /projects/:projectId
 * Update project name or description.
 */
const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;

    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    });

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /projects/:projectId
 * Delete a project and all associated tables, API keys, etc.
 */
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user.id },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Cascade deletes apiKeys, tables, relationships via Prisma relations
    await prisma.project.delete({ where: { id: projectId } });

    res.json({ success: true, message: `Project "${existing.name}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { createProject, listProjects, getProject, updateProject, deleteProject };

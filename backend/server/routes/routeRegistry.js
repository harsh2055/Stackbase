// server/routes/routeRegistry.js
// Manages all dynamically registered API routes.
// When a table is created, its CRUD routes are registered here immediately.
// On server startup, all previously created tables are loaded and re-registered.

const express = require('express');
const { buildCrudHandlers } = require('../generators/apiGenerator');

class RouteRegistry {
  constructor() {
    // The Express router that holds all dynamic routes
    this.router = express.Router();
    // Map of registered table names for tracking
    this.registeredTables = new Set();
  }

  /**
   * Register CRUD routes for a table.
   * This can be called at startup (for existing tables) or at runtime (for new tables).
   *
   * Routes registered:
   *   GET    /api/:tableName          — list all
   *   GET    /api/:tableName/:id      — get one
   *   POST   /api/:tableName          — create
   *   PUT    /api/:tableName/:id      — update
   *   DELETE /api/:tableName/:id      — delete
   *
   * @param {string} tableName
   */
  registerTable(tableName) {
    if (this.registeredTables.has(tableName)) {
      console.log(`[Router] Routes for "${tableName}" already registered — skipping`);
      return;
    }

    const handlers = buildCrudHandlers(tableName);
    const basePath = `/${tableName}`;

    // Register all 5 CRUD routes
    this.router.get(basePath, handlers.getAll);
    this.router.get(`${basePath}/:id`, handlers.getOne);
    this.router.post(basePath, handlers.create);
    this.router.put(`${basePath}/:id`, handlers.update);
    this.router.delete(`${basePath}/:id`, handlers.remove);

    this.registeredTables.add(tableName);
    console.log(`[Router] ✓ Registered routes for table: "${tableName}"`);
    console.log(`         GET    /api/${tableName}`);
    console.log(`         GET    /api/${tableName}/:id`);
    console.log(`         POST   /api/${tableName}`);
    console.log(`         PUT    /api/${tableName}/:id`);
    console.log(`         DELETE /api/${tableName}/:id`);
  }

  /**
   * Load all existing tables from the database and register their routes.
   * Called once at server startup.
   * @param {string[]} tableNames - Array of table names from the DB
   */
  loadExistingTables(tableNames) {
    if (!tableNames || tableNames.length === 0) {
      console.log('[Router] No existing tables found — starting fresh');
      return;
    }
    console.log(`[Router] Loading ${tableNames.length} existing table(s)...`);
    tableNames.forEach((name) => this.registerTable(name));
  }

  /**
   * Get the list of all registered table names.
   * @returns {string[]}
   */
  getRegisteredTables() {
    return Array.from(this.registeredTables);
  }

  /**
   * Check if a table has registered routes.
   * @param {string} tableName
   * @returns {boolean}
   */
  isRegistered(tableName) {
    return this.registeredTables.has(tableName);
  }
}

// Export a singleton instance
const routeRegistry = new RouteRegistry();
module.exports = routeRegistry;

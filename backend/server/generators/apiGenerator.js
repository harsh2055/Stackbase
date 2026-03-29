// server/generators/apiGenerator.js
// Dynamically generates CRUD route handlers for any table at runtime.
// Phase 6: All mutating operations (POST/PUT/DELETE) now emit real-time events
// to subscribed WebSocket clients via the realtimeService.

const { query } = require('../../config/db');
const { sanitizeIdentifier } = require('./sqlGenerator');
const rt = require('../services/realtimeService');

/**
 * Build a complete set of CRUD handlers for a given table.
 * Returns an object with Express-compatible route handlers.
 *
 * @param {string} tableName - The PostgreSQL table name
 * @returns {Object} - { getAll, getOne, create, update, remove }
 */
const buildCrudHandlers = (tableName) => {
  const table = sanitizeIdentifier(tableName);

  /**
   * GET /:table
   * Query params: ?limit=20&offset=0&order_by=created_at&order=desc
   * Also supports simple column filtering: ?name=Tesla&price=50000
   */
  const getAll = async (req, res) => {
    try {
      const {
        limit = 20,
        offset = 0,
        order_by = 'created_at',
        order = 'desc',
        ...filters
      } = req.query;

      // Validate pagination
      const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const safeOffset = Math.max(parseInt(offset) || 0, 0);

      // Validate order direction
      const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Build WHERE clause from filters
      const filterKeys = Object.keys(filters);
      let whereClause = '';
      const queryParams = [];

      if (filterKeys.length > 0) {
        const conditions = filterKeys.map((key, idx) => {
          const safeKey = sanitizeIdentifier(key);
          queryParams.push(filters[key]);
          return `${safeKey} = $${idx + 1}`;
        });
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      // Count total records
      const countResult = await query(
        `SELECT COUNT(*) FROM ${table} ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Fetch records
      const paginationParams = [...queryParams, safeLimit, safeOffset];
      const rows = await query(
        `SELECT * FROM ${table} ${whereClause} ORDER BY ${order_by} ${safeOrder} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
        paginationParams
      );

      res.json({
        success: true,
        data: rows.rows,
        meta: {
          total,
          limit: safeLimit,
          offset: safeOffset,
          count: rows.rows.length,
        },
      });
    } catch (error) {
      console.error(`[API] GET /${table} error:`, error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /:table/:id
   * Fetches a single record by UUID primary key.
   */
  const getOne = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Record with id "${id}" not found in table "${table}"`,
        });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error(`[API] GET /${table}/:id error:`, error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /:table
   * Creates a new record. Body should contain column key-value pairs.
   * id, created_at, and updated_at are auto-managed.
   */
  const create = async (req, res) => {
    try {
      const body = req.body;

      // Remove auto-managed fields
      const { id, created_at, updated_at, ...data } = body;

      const keys = Object.keys(data);
      if (keys.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Request body cannot be empty',
        });
      }

      // Sanitize column names
      const safeKeys = keys.map(sanitizeIdentifier);
      const values = keys.map((k) => data[k]);
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');

      const result = await query(
        `INSERT INTO ${table} (${safeKeys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );

      // Phase 6: broadcast INSERT event to WebSocket subscribers
      rt.notifyInsert(table, result.rows[0]);

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error(`[API] POST /${table} error:`, error.message);
      // Friendly error for constraint violations
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'Duplicate value violates unique constraint' });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * PUT /:table/:id
   * Updates a record by id. Only updates fields provided in the body.
   * Partial updates (PATCH-style) are supported.
   */
  const update = async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;

      // Remove auto-managed fields
      const { id: _id, created_at, updated_at, ...data } = body;

      const keys = Object.keys(data);
      if (keys.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      // Build SET clause
      const safeKeys = keys.map(sanitizeIdentifier);
      const setClauses = safeKeys.map((k, idx) => `${k} = $${idx + 1}`).join(', ');
      const values = keys.map((k) => data[k]);

      const result = await query(
        `UPDATE ${table} SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Record with id "${id}" not found in table "${table}"`,
        });
      }

      // Phase 6: broadcast UPDATE event to WebSocket subscribers
      rt.notifyUpdate(table, result.rows[0]);

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error(`[API] PUT /${table}/:id error:`, error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * DELETE /:table/:id
   * Deletes a record by id. Returns the deleted record.
   */
  const remove = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query(
        `DELETE FROM ${table} WHERE id = $1 RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Record with id "${id}" not found in table "${table}"`,
        });
      }

      // Phase 6: broadcast DELETE event to WebSocket subscribers
      rt.notifyDelete(table, result.rows[0]);

      res.json({
        success: true,
        message: `Record deleted successfully`,
        data: result.rows[0],
      });
    } catch (error) {
      console.error(`[API] DELETE /${table}/:id error:`, error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  return { getAll, getOne, create, update, remove };
};

module.exports = { buildCrudHandlers };

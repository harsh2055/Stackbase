// backend/server/functions/triggerManager.js
// Phase 7 — Serverless Functions Engine
//
// Bridges Phase 6 (Real-Time events) and Phase 7 (Serverless Functions).
// When a database event fires (INSERT/UPDATE/DELETE), the trigger manager
// finds all matching enabled functions for that table and executes them.
//
// Supported trigger types:
//   onInsert  — fires after INSERT on a table
//   onUpdate  — fires after UPDATE on a table
//   onDelete  — fires after DELETE on a table
//   http      — fired by HTTP POST to /functions/:projectId/:path
//   schedule  — fired by cron (basic interval-based implementation)

'use strict';

const prisma = require('../../config/prisma');
const { executeFunction } = require('./runtime');
const functionService = require('../services/functionService');

/**
 * Handle a database event by finding and executing matching functions.
 * Called from realtimeService after INSERT/UPDATE/DELETE.
 *
 * @param {string} projectId
 * @param {string} pgTableName  - e.g. "prj_abc12345_bookings"
 * @param {'INSERT'|'UPDATE'|'DELETE'} eventType
 * @param {Object} data         - the affected row
 */
const handleDatabaseEvent = async (projectId, pgTableName, eventType, data) => {
  const triggerMap = {
    INSERT: 'onInsert',
    UPDATE: 'onUpdate',
    DELETE: 'onDelete',
  };

  const triggerType = triggerMap[eventType];
  if (!triggerType) return;

  // Extract the logical table name from the pg name (strip prj_xxx_ prefix)
  // e.g. prj_abc12345_bookings → bookings
  const logicalName = pgTableName.replace(/^prj_[a-z0-9]+_/, '');

  try {
    // Find all enabled functions matching this project + table + trigger
    const functions = await prisma.function.findMany({
      where: {
        projectId,
        enabled: true,
        triggerType,
        OR: [
          { tableName: pgTableName },   // exact pg name match
          { tableName: logicalName },    // logical name match
        ],
      },
    });

    if (functions.length === 0) return;

    console.log(`[Functions] ${eventType} on ${pgTableName} → executing ${functions.length} function(s)`);

    // Execute all matching functions in parallel (fire and forget)
    for (const fn of functions) {
      functionService.executeAndLog(fn, {
        table:  pgTableName,
        event:  eventType,
        data,
        timestamp: new Date().toISOString(),
      }, `${triggerType}:${pgTableName}`).catch((err) => {
        console.error(`[Functions] Error executing "${fn.name}":`, err.message);
      });
    }
  } catch (err) {
    console.error('[Functions] handleDatabaseEvent error:', err.message);
  }
};

// ── Schedule trigger ──────────────────────────────────────────────────────────
// Simple interval-based scheduler. Fires functions every N seconds.
// For production, replace with a proper cron library.

const scheduleTimers = new Map(); // functionId → interval

/**
 * Start a scheduled function.
 * @param {{ id: string, projectId: string, schedule: string, name: string }} fn
 */
const startSchedule = (fn) => {
  if (scheduleTimers.has(fn.id)) return; // already running

  // Parse simple schedules like "30s", "1m", "5m", "1h"
  const intervalMs = parseSchedule(fn.schedule);
  if (!intervalMs) {
    console.warn(`[Functions] Invalid schedule "${fn.schedule}" for function "${fn.name}"`);
    return;
  }

  const timer = setInterval(async () => {
    const current = await prisma.function.findUnique({ where: { id: fn.id } });
    if (!current || !current.enabled) {
      stopSchedule(fn.id);
      return;
    }

    functionService.executeAndLog(current, {
      trigger: 'schedule',
      schedule: fn.schedule,
      timestamp: new Date().toISOString(),
    }, `schedule:${fn.schedule}`).catch(() => {});
  }, intervalMs);

  scheduleTimers.set(fn.id, timer);
  console.log(`[Functions] Scheduled "${fn.name}" every ${fn.schedule}`);
};

const stopSchedule = (functionId) => {
  const timer = scheduleTimers.get(functionId);
  if (timer) {
    clearInterval(timer);
    scheduleTimers.delete(functionId);
  }
};

/**
 * Load all enabled schedule functions from DB and start their timers.
 * Called on server startup.
 */
const initSchedules = async () => {
  try {
    const fns = await prisma.function.findMany({
      where: { triggerType: 'schedule', enabled: true },
    });
    for (const fn of fns) startSchedule(fn);
    console.log(`[Functions] Initialized ${fns.length} scheduled function(s)`);
  } catch (err) {
    console.error('[Functions] initSchedules error:', err.message);
  }
};

/**
 * Parse a schedule string to milliseconds.
 * Supports: "30s", "1m", "5m", "1h", "24h"
 */
const parseSchedule = (schedule) => {
  if (!schedule) return null;
  const match = schedule.match(/^(\d+)(s|m|h)$/);
  if (!match) return null;
  const [, num, unit] = match;
  const n = parseInt(num);
  if (unit === 's') return n * 1000;
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 3600 * 1000;
  return null;
};

module.exports = { handleDatabaseEvent, startSchedule, stopSchedule, initSchedules };

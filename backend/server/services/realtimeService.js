// backend/server/services/realtimeService.js
// Phase 6 — Real-Time Data Engine
// Phase 7 — Updated to also fire serverless function triggers

'use strict';

const { emitInsert, emitUpdate, emitDelete, broadcast } = require('../realtime/eventDispatcher');

// Lazy-load triggerManager to avoid circular deps at startup
const getTriggerManager = () => require('../functions/triggerManager');

/**
 * Notify subscribers + trigger matching serverless functions after INSERT.
 */
const notifyInsert = (table, row, projectId) => {
  try { emitInsert(table, row); } catch {}
  if (projectId) {
    try { getTriggerManager().handleDatabaseEvent(projectId, table, 'INSERT', row); } catch {}
  }
};

/**
 * Notify subscribers + trigger matching serverless functions after UPDATE.
 */
const notifyUpdate = (table, row, projectId) => {
  try { emitUpdate(table, row); } catch {}
  if (projectId) {
    try { getTriggerManager().handleDatabaseEvent(projectId, table, 'UPDATE', row); } catch {}
  }
};

/**
 * Notify subscribers + trigger matching serverless functions after DELETE.
 */
const notifyDelete = (table, row, projectId) => {
  try { emitDelete(table, row); } catch {}
  if (projectId) {
    try { getTriggerManager().handleDatabaseEvent(projectId, table, 'DELETE', row); } catch {}
  }
};

module.exports = { notifyInsert, notifyUpdate, notifyDelete, broadcast };

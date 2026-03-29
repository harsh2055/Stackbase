// backend/server/realtime/eventDispatcher.js
// Phase 6 — Real-Time Data Engine
//
// Broadcasts database change events to all WebSocket clients
// subscribed to the affected table.
//
// Event payload sent to clients:
// {
//   "table": "bookings",
//   "event": "INSERT" | "UPDATE" | "DELETE",
//   "data":  { ...row },
//   "timestamp": "2026-03-19T10:14:22.000Z"
// }

'use strict';

const WebSocket = require('ws');
const subscriptionManager = require('./subscriptionManager');

/**
 * Broadcast a database change event to all subscribed clients.
 *
 * @param {string} table      - The PostgreSQL table name (e.g. "prj_abc12345_bookings")
 * @param {'INSERT'|'UPDATE'|'DELETE'} event - The type of change
 * @param {Object} data       - The affected row data
 */
const broadcast = (table, event, data) => {
  const subscribers = subscriptionManager.getSubscribers(table);

  if (subscribers.size === 0) return; // No one listening — skip

  const payload = JSON.stringify({
    table,
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  let sent = 0;
  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
        sent++;
      } catch (err) {
        console.error(`[RT] Send error to subscriber:`, err.message);
      }
    }
  }

  if (sent > 0) {
    console.log(`[RT] Broadcast ${event} on "${table}" → ${sent} client(s)`);
  }
};

/**
 * Emit an INSERT event.
 * Called by the CRUD API generator after a successful INSERT.
 *
 * @param {string} table
 * @param {Object} row - The newly inserted row (from RETURNING *)
 */
const emitInsert = (table, row) => broadcast(table, 'INSERT', row);

/**
 * Emit an UPDATE event.
 * Called after a successful UPDATE.
 */
const emitUpdate = (table, row) => broadcast(table, 'UPDATE', row);

/**
 * Emit a DELETE event.
 * Called after a successful DELETE.
 */
const emitDelete = (table, row) => broadcast(table, 'DELETE', row);

module.exports = { broadcast, emitInsert, emitUpdate, emitDelete };

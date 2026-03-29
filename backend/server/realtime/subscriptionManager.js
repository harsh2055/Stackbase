// backend/server/realtime/subscriptionManager.js
// Phase 6 — Real-Time Data Engine
//
// Manages WebSocket client subscriptions.
// A client can subscribe to one or more tables and will receive
// INSERT / UPDATE / DELETE events on those tables in real time.
//
// Subscription message format (client → server):
//   { "type": "subscribe",   "table": "bookings" }
//   { "type": "unsubscribe", "table": "bookings" }
//   { "type": "ping" }
//
// Event format (server → client):
//   { "table": "bookings", "event": "INSERT", "data": { ...row } }

'use strict';

class SubscriptionManager {
  constructor() {
    // Map<tableName, Set<WebSocket>>
    this._tableSubs = new Map();
    // Map<WebSocket, Set<tableName>>
    this._clientSubs = new Map();
    // Map<WebSocket, { projectId, connectedAt, id }>
    this._clientMeta = new Map();
    this._counter = 0;
  }

  /**
   * Register a new WebSocket client.
   * Called when a connection is established.
   * @param {WebSocket} ws
   * @param {{ projectId: string }} meta
   */
  addClient(ws, meta = {}) {
    this._counter++;
    this._clientMeta.set(ws, { ...meta, connectedAt: Date.now(), id: this._counter });
    this._clientSubs.set(ws, new Set());
    console.log(`[RT] Client #${this._counter} connected (project: ${meta.projectId || 'unknown'})`);
  }

  /**
   * Remove a WebSocket client and clean up all its subscriptions.
   * Called when a connection closes.
   * @param {WebSocket} ws
   */
  removeClient(ws) {
    const meta = this._clientMeta.get(ws);
    const subs = this._clientSubs.get(ws);

    if (subs) {
      for (const table of subs) {
        const set = this._tableSubs.get(table);
        if (set) {
          set.delete(ws);
          if (set.size === 0) this._tableSubs.delete(table);
        }
      }
    }

    this._clientMeta.delete(ws);
    this._clientSubs.delete(ws);

    console.log(`[RT] Client #${meta?.id || '?'} disconnected`);
  }

  /**
   * Subscribe a client to a table.
   * @param {WebSocket} ws
   * @param {string} table
   */
  subscribe(ws, table) {
    if (!this._tableSubs.has(table)) {
      this._tableSubs.set(table, new Set());
    }
    this._tableSubs.get(table).add(ws);
    this._clientSubs.get(ws)?.add(table);

    const meta = this._clientMeta.get(ws);
    console.log(`[RT] Client #${meta?.id} subscribed to "${table}"`);
  }

  /**
   * Unsubscribe a client from a table.
   * @param {WebSocket} ws
   * @param {string} table
   */
  unsubscribe(ws, table) {
    this._tableSubs.get(table)?.delete(ws);
    this._clientSubs.get(ws)?.delete(table);
  }

  /**
   * Get all WebSocket clients subscribed to a table.
   * @param {string} table
   * @returns {Set<WebSocket>}
   */
  getSubscribers(table) {
    return this._tableSubs.get(table) || new Set();
  }

  /**
   * Get all tables a client is subscribed to.
   * @param {WebSocket} ws
   * @returns {Set<string>}
   */
  getClientSubscriptions(ws) {
    return this._clientSubs.get(ws) || new Set();
  }

  /**
   * Get a snapshot of all active subscriptions (for the /realtime/stats endpoint).
   */
  getStats() {
    const tables = {};
    for (const [table, subs] of this._tableSubs.entries()) {
      tables[table] = subs.size;
    }
    return {
      totalClients:       this._clientMeta.size,
      totalSubscriptions: [...this._clientSubs.values()].reduce((s, v) => s + v.size, 0),
      tables,
    };
  }
}

// Singleton — shared across the entire process
const subscriptionManager = new SubscriptionManager();
module.exports = subscriptionManager;

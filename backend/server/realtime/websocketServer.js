// backend/server/realtime/websocketServer.js
// Phase 6 — Real-Time Data Engine
//
// Creates and manages the WebSocket server.
// Runs on the SAME port as Express using HTTP server upgrade.
//
// Client connection URL:
//   ws://localhost:4000/realtime
//   wss://stackbase-backend.onrender.com/realtime  (production)
//
// Authentication:
//   Send API key in first message or as query param: ?apiKey=pk_live_xxx
//   JWT Bearer also accepted: ?token=eyJ...
//
// Client → Server messages:
//   { "type": "subscribe",   "table": "prj_abc_bookings" }
//   { "type": "unsubscribe", "table": "prj_abc_bookings" }
//   { "type": "ping" }
//
// Server → Client messages:
//   { "type": "connected",  "message": "..." }
//   { "type": "subscribed", "table": "..." }
//   { "type": "event",      "table": "...", "event": "INSERT", "data": {...}, "timestamp": "..." }
//   { "type": "error",      "message": "..." }
//   { "type": "pong" }

'use strict';

const WebSocket = require('ws');
const url       = require('url');
const { verifyToken } = require('../services/authService');
const subscriptionManager = require('./subscriptionManager');

let wss = null;

/**
 * Attach the WebSocket server to an existing HTTP server.
 * Must be called AFTER app.listen() returns the http.Server instance.
 *
 * @param {http.Server} httpServer
 */
const attachWebSocketServer = (httpServer) => {
  wss = new WebSocket.Server({
    server: httpServer,
    path: '/realtime',
  });

  wss.on('connection', (ws, req) => {
    handleConnection(ws, req);
  });

  wss.on('error', (err) => {
    console.error('[RT] WebSocket server error:', err.message);
  });

  console.log('[RT] WebSocket server attached at /realtime');
  return wss;
};

/**
 * Handle a new WebSocket connection.
 */
const handleConnection = (ws, req) => {
  const parsed   = url.parse(req.url, true);
  const apiKey   = parsed.query.apiKey   || null;
  const token    = parsed.query.token    || null;
  const projectId = parsed.query.projectId || null;

  // Resolve identity (optional — we allow unauthenticated subscriptions for simplicity,
  // but production should enforce auth here)
  let userId = null;
  if (token) {
    try {
      const decoded = verifyToken(token);
      userId = decoded.id;
    } catch {
      // Invalid token — allow connection but mark as unauthenticated
    }
  }

  // Register client
  subscriptionManager.addClient(ws, { projectId, userId, apiKey });

  // Send welcome message
  send(ws, { type: 'connected', message: 'Real-time engine ready. Send subscribe messages to listen to tables.' });

  // Handle incoming messages
  ws.on('message', (raw) => {
    handleMessage(ws, raw);
  });

  // Handle disconnect
  ws.on('close', () => {
    subscriptionManager.removeClient(ws);
  });

  ws.on('error', (err) => {
    console.error('[RT] Client error:', err.message);
    subscriptionManager.removeClient(ws);
  });

  // Heartbeat — keep connection alive through proxies (Render, Vercel, etc.)
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
};

/**
 * Handle a message from a client.
 */
const handleMessage = (ws, raw) => {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    send(ws, { type: 'error', message: 'Invalid JSON' });
    return;
  }

  switch (msg.type) {
    case 'subscribe': {
      if (!msg.table || typeof msg.table !== 'string') {
        send(ws, { type: 'error', message: 'subscribe requires a "table" field' });
        return;
      }
      const table = msg.table.trim();
      subscriptionManager.subscribe(ws, table);
      send(ws, { type: 'subscribed', table, message: `Subscribed to "${table}"` });
      break;
    }

    case 'unsubscribe': {
      if (!msg.table) return;
      subscriptionManager.unsubscribe(ws, msg.table.trim());
      send(ws, { type: 'unsubscribed', table: msg.table.trim() });
      break;
    }

    case 'ping': {
      send(ws, { type: 'pong', timestamp: new Date().toISOString() });
      break;
    }

    case 'subscriptions': {
      // Client asks which tables it is subscribed to
      const subs = Array.from(subscriptionManager.getClientSubscriptions(ws));
      send(ws, { type: 'subscriptions', tables: subs });
      break;
    }

    default: {
      send(ws, { type: 'error', message: `Unknown message type: "${msg.type}"` });
    }
  }
};

/**
 * Send a JSON message to a client, safely.
 */
const send = (ws, data) => {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error('[RT] send error:', err.message);
    }
  }
};

/**
 * Start the heartbeat interval.
 * Terminates dead connections every 30 seconds.
 */
const startHeartbeat = () => {
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        subscriptionManager.removeClient(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  return interval;
};

/**
 * Get the WebSocket server instance (for stats).
 */
const getWss = () => wss;

module.exports = { attachWebSocketServer, startHeartbeat, getWss };

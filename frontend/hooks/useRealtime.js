// frontend/hooks/useRealtime.js
// Phase 6 — Real-Time Data Engine
//
// Custom hook that manages a WebSocket connection to the Stackbase
// realtime engine. Handles:
//   - Connection lifecycle (connect, disconnect, reconnect)
//   - Table subscriptions
//   - Incoming event routing per table
//   - Auto-reconnect with exponential backoff
//
// Usage:
//   const { connected, subscribe, on, off } = useRealtime(projectId, apiKey);
//   const cleanup = on('prj_abc_bookings', (event) => console.log(event));

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE = (() => {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return api.replace(/^http/, 'ws');
})();

const MAX_RECONNECT_DELAY = 30000; // 30s max
const BASE_RECONNECT_DELAY = 1000; // 1s initial

export function useRealtime(projectId, apiKey) {
  const wsRef          = useRef(null);
  const listenersRef   = useRef({}); // { tableName: Set<callback> }
  const reconnectDelay = useRef(BASE_RECONNECT_DELAY);
  const reconnectTimer = useRef(null);
  const unmountedRef   = useRef(false);
  const subscribedRef  = useRef(new Set()); // tables we want subscribed

  const [connected,  setConnected]  = useState(false);
  const [status,     setStatus]     = useState('disconnected'); // disconnected | connecting | connected | error
  const [lastEvent,  setLastEvent]  = useState(null);

  // ── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (apiKey)    params.set('apiKey', apiKey);

    const url = `${WS_BASE}/realtime?${params.toString()}`;
    setStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) return ws.close();
      setConnected(true);
      setStatus('connected');
      reconnectDelay.current = BASE_RECONNECT_DELAY;

      // Re-subscribe to all tables after reconnect
      for (const table of subscribedRef.current) {
        ws.send(JSON.stringify({ type: 'subscribe', table }));
      }
    };

    ws.onmessage = (e) => {
      if (unmountedRef.current) return;
      try {
        const msg = JSON.parse(e.data);

        // Route database events to per-table listeners
        if (msg.table && msg.event) {
          setLastEvent(msg);
          const handlers = listenersRef.current[msg.table];
          if (handlers) {
            for (const cb of handlers) {
              try { cb(msg); } catch {}
            }
          }
          // Also fire wildcard listeners ('*')
          const wildcards = listenersRef.current['*'];
          if (wildcards) {
            for (const cb of wildcards) {
              try { cb(msg); } catch {}
            }
          }
        }
      } catch {}
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setConnected(false);
      setStatus('disconnected');
      wsRef.current = null;

      // Auto-reconnect with backoff
      reconnectTimer.current = setTimeout(() => {
        if (!unmountedRef.current) {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY);
          connect();
        }
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      setStatus('error');
    };
  }, [projectId, apiKey]);

  // ── Subscribe to a table ──────────────────────────────────────────────────
  const subscribe = useCallback((table) => {
    subscribedRef.current.add(table);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', table }));
    }
  }, []);

  // ── Unsubscribe from a table ──────────────────────────────────────────────
  const unsubscribe = useCallback((table) => {
    subscribedRef.current.delete(table);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', table }));
    }
  }, []);

  // ── Register an event listener for a table ────────────────────────────────
  const on = useCallback((table, callback) => {
    if (!listenersRef.current[table]) {
      listenersRef.current[table] = new Set();
    }
    listenersRef.current[table].add(callback);

    // Return cleanup function
    return () => {
      listenersRef.current[table]?.delete(callback);
    };
  }, []);

  // ── Remove a listener ─────────────────────────────────────────────────────
  const off = useCallback((table, callback) => {
    listenersRef.current[table]?.delete(callback);
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent auto-reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    connected,
    status,
    lastEvent,
    subscribe,
    unsubscribe,
    on,
    off,
  };
}

/**
 * useTableRealtime — convenience hook that subscribes to a single table
 * and returns a list of recent events.
 *
 * @param {string} tableName  - full pg table name e.g. "prj_abc12345_bookings"
 * @param {string} projectId
 * @param {string} apiKey
 * @param {number} maxEvents  - max events to keep in memory (default 50)
 */
export function useTableRealtime(tableName, projectId, apiKey, maxEvents = 50) {
  const { connected, status, subscribe, unsubscribe, on, off } = useRealtime(projectId, apiKey);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!tableName) return;

    subscribe(tableName);

    const cleanup = on(tableName, (event) => {
      setEvents((prev) => [event, ...prev].slice(0, maxEvents));
    });

    return () => {
      cleanup();
      unsubscribe(tableName);
    };
  }, [tableName, subscribe, unsubscribe, on, maxEvents]);

  const clearEvents = () => setEvents([]);

  return { connected, status, events, clearEvents };
}

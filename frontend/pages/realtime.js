// frontend/pages/realtime.js
// Phase 6 — Real-Time Data Engine page.
// Left panel: subscription manager (subscribe/unsubscribe tables)
// Right panel: live event feed + connection status + code example

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AppLayout from '../components/Layout/AppLayout';
import RealtimeIndicator from '../components/Realtime/RealtimeIndicator';
import EventFeed from '../components/Realtime/EventFeed';
import SubscriptionPanel from '../components/Realtime/SubscriptionPanel';
import { Button, Card, Spinner } from '../components/UI';
import { useProject, useProjectTables, useApiKeys } from '../hooks/useProjects';
import { useRealtime } from '../hooks/useRealtime';
import { useAuth } from '../context/AuthContext';
import { setTokenGetter } from '../lib/api';
import withAuth from '../components/Auth/withAuth';

const WS_BASE = (() => {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return api.replace(/^http/, 'ws');
})();

function RealtimePage() {
  const router = useRouter();
  const { project: projectId } = router.query;
  const { token } = useAuth();
  setTokenGetter(() => token);

  const { project }           = useProject(projectId);
  const { tables }            = useProjectTables(projectId);
  const { keys }              = useApiKeys(projectId);

  // Use the first API key for WebSocket auth
  const apiKey = keys[0]?.keyMasked ? null : null; // keys are masked — user must supply real key
  const [userApiKey, setUserApiKey] = useState('');

  const { connected, status, lastEvent, subscribe, unsubscribe, on, off } = useRealtime(
    projectId,
    userApiKey || undefined
  );

  const [subscribed, setSubscribed]   = useState(new Set());
  const [events, setEvents]           = useState([]);
  const [eventCount, setEventCount]   = useState({ INSERT: 0, UPDATE: 0, DELETE: 0 });
  const [activeTab, setActiveTab]     = useState('feed'); // feed | code

  // Wire up event listener for all events
  useEffect(() => {
    const cleanup = on('*', (event) => {
      setEvents((prev) => [event, ...prev].slice(0, 100));
      setEventCount((prev) => ({
        ...prev,
        [event.event]: (prev[event.event] || 0) + 1,
      }));
    });
    return cleanup;
  }, [on]);

  const handleSubscribe = useCallback((table) => {
    subscribe(table);
    setSubscribed((prev) => new Set([...prev, table]));
  }, [subscribe]);

  const handleUnsubscribe = useCallback((table) => {
    unsubscribe(table);
    setSubscribed((prev) => {
      const next = new Set(prev);
      next.delete(table);
      return next;
    });
  }, [unsubscribe]);

  if (!projectId) {
    return (
      <AppLayout title="Realtime" subtitle="stackbase / realtime">
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-2)' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚡</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Select a project to use Realtime</div>
          <Link href="/"><Button variant="outline">Go to Projects</Button></Link>
        </div>
      </AppLayout>
    );
  }

  const exampleTableName = tables[0]?.pgTableName || tables[0]?.tableName || 'prj_abc12345_bookings';
  const wsUrl = `${WS_BASE}/realtime?projectId=${projectId}`;

  return (
    <AppLayout
      title="Realtime"
      subtitle={`${project?.name || '...'} / realtime`}
      activeProject={project}
      actions={<RealtimeIndicator status={status} />}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' }}>Real-Time Engine</h1>
          <span style={{
            background: 'var(--blue-dim)', border: '1px solid rgba(96,165,250,0.3)',
            borderRadius: 12, padding: '2px 10px',
            fontSize: 11, color: 'var(--blue)', fontWeight: 500,
          }}>Phase 6</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Subscribe to database tables and receive live INSERT / UPDATE / DELETE events via WebSocket.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          ['Connection', connected ? 'Connected' : 'Disconnected', connected ? 'var(--accent)' : 'var(--text-2)'],
          ['Subscriptions', subscribed.size, 'var(--text-0)'],
          ['Inserts',  eventCount.INSERT, 'var(--accent-light)'],
          ['Updates',  eventCount.UPDATE, 'var(--yellow)'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Left — subscription panel */}
        <div>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
              Subscriptions
            </div>
            <SubscriptionPanel
              tables={tables}
              subscribed={subscribed}
              onSubscribe={handleSubscribe}
              onUnsubscribe={handleUnsubscribe}
            />
          </Card>

          {/* API Key input for auth */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
              Auth (optional)
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
              Enter your API key to authenticate the WebSocket connection
            </div>
            <input
              value={userApiKey}
              onChange={(e) => setUserApiKey(e.target.value)}
              placeholder="pk_live_..."
              style={{
                width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '7px 10px', fontSize: 12, color: 'var(--text-0)',
                outline: 'none', fontFamily: 'JetBrains Mono, monospace',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
            />
          </Card>
        </div>

        {/* Right — event feed + code */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
            {[['feed', 'Live Feed'], ['code', 'Client Code']].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: 'none', border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '7px 14px', marginBottom: -1,
                fontSize: 13, fontWeight: activeTab === tab ? 500 : 400,
                color: activeTab === tab ? 'var(--text-0)' : 'var(--text-2)',
                cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
              }}>{label}</button>
            ))}
            {events.length > 0 && (
              <button
                onClick={() => setEvents([])}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12, padding: '7px 10px' }}
              >
                Clear
              </button>
            )}
          </div>

          {activeTab === 'feed' && (
            <EventFeed events={events} height={420} autoScroll />
          )}

          {activeTab === 'code' && (
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-2)', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>browser · client.js</span>
              </div>
              <pre style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                color: 'var(--text-1)', padding: '16px 18px',
                lineHeight: 1.7, overflow: 'auto', margin: 0,
              }}>
{`// Connect to the Stackbase realtime engine
const socket = new WebSocket(
  '${wsUrl}'
);

socket.onopen = () => {
  console.log('Connected to realtime engine');

  // Subscribe to a table
  socket.send(JSON.stringify({
    type: 'subscribe',
    table: '${exampleTableName}'
  }));
};

// Listen for events
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.event === 'INSERT') {
    console.log('New record:', data.data);
  }
  if (data.event === 'UPDATE') {
    console.log('Updated:', data.data);
  }
  if (data.event === 'DELETE') {
    console.log('Deleted:', data.data);
  }
};

// Keep alive
socket.onclose = () => {
  console.log('Disconnected — reconnecting...');
  setTimeout(() => reconnect(), 3000);
};

// Event payload format:
// {
//   table: '${exampleTableName}',
//   event: 'INSERT' | 'UPDATE' | 'DELETE',
//   data:  { id: '...', ...fields },
//   timestamp: '2026-03-22T10:14:22.000Z'
// }`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default withAuth(RealtimePage);

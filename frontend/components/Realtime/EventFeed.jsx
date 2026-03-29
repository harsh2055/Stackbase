// frontend/components/Realtime/EventFeed.jsx
// Scrolling feed of real-time database events.
// Shows INSERT / UPDATE / DELETE events as they arrive via WebSocket.

import { useEffect, useRef } from 'react';

const EVENT_STYLE = {
  INSERT: { color: '#6ee7b7', bg: '#064e3b', label: 'INSERT' },
  UPDATE: { color: '#fbbf24', bg: '#451a03', label: 'UPDATE' },
  DELETE: { color: '#f87171', bg: '#450a0a', label: 'DELETE' },
};

function EventRow({ event }) {
  const s = EVENT_STYLE[event.event] || EVENT_STYLE.INSERT;
  const ts = event.timestamp
    ? new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false })
    : '';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '72px 100px 1fr',
        gap: 10,
        padding: '7px 14px',
        borderBottom: '1px solid var(--border)',
        alignItems: 'start',
        animation: 'rt-slide-in 0.2s ease-out',
      }}
    >
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-3)' }}>
        {ts}
      </span>
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        background: s.bg, color: s.color,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10, fontWeight: 700,
        padding: '2px 7px', borderRadius: 3,
        letterSpacing: '0.5px',
      }}>
        {s.label}
      </span>
      <div>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: 'var(--text-2)', marginBottom: 3, display: 'block',
        }}>
          {event.table}
        </span>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: 'var(--text-0)',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {event.data ? JSON.stringify(event.data).slice(0, 120) : ''}
        </span>
      </div>
    </div>
  );
}

export default function EventFeed({ events = [], height = 400, autoScroll = true }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events.length, autoScroll]);

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981', animation: 'rt-pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Live Event Feed
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '72px 100px 1fr', gap: 10,
        padding: '5px 14px 4px',
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
        fontSize: 10, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        <span>Time</span>
        <span>Event</span>
        <span>Data</span>
      </div>

      {/* Events */}
      <div style={{ height, overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8, color: 'var(--text-3)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            <span style={{ fontSize: 12 }}>Waiting for database events…</span>
            <span style={{ fontSize: 11 }}>Try inserting, updating, or deleting a record</span>
          </div>
        ) : (
          // Show newest first
          [...events].reverse().map((event, i) => (
            <EventRow key={`${event.timestamp}-${i}`} event={event} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes rt-slide-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rt-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

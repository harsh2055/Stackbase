// frontend/components/Realtime/RealtimeIndicator.jsx
// Small badge showing WebSocket connection status.
// Used in the topbar and on the Realtime page.

export default function RealtimeIndicator({ status, compact = false }) {
  const config = {
    connected:    { color: '#10b981', bg: '#064e3b', label: 'Live',         pulse: true  },
    connecting:   { color: '#fbbf24', bg: '#451a03', label: 'Connecting…',  pulse: true  },
    disconnected: { color: '#71717a', bg: '#27272a', label: 'Disconnected', pulse: false },
    error:        { color: '#f87171', bg: '#450a0a', label: 'Error',        pulse: false },
  };

  const c = config[status] || config.disconnected;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: c.bg,
      borderRadius: 12,
      padding: compact ? '3px 8px' : '4px 10px',
      border: `1px solid ${c.color}33`,
    }}>
      <div style={{
        width: compact ? 6 : 7,
        height: compact ? 6 : 7,
        borderRadius: '50%',
        background: c.color,
        boxShadow: c.pulse ? `0 0 5px ${c.color}` : 'none',
        flexShrink: 0,
        animation: c.pulse ? 'rt-pulse 2s ease-in-out infinite' : 'none',
      }} />
      {!compact && (
        <span style={{ fontSize: 11, color: c.color, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>
          {c.label}
        </span>
      )}
      <style>{`
        @keyframes rt-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

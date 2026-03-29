// frontend/components/Deployments/TerminalLog.jsx
// Terminal-style log viewer. Renders deployment log entries with
// color-coded levels (info/warn/error/success) and timestamps.

import { useEffect, useRef } from 'react';

const LEVEL_STYLE = {
  info:    { color: '#a1a1aa' },
  warn:    { color: '#fbbf24' },
  error:   { color: '#f87171' },
  success: { color: '#6ee7b7' },
};

const LEVEL_PREFIX = {
  info:    'INFO   ',
  warn:    'WARN   ',
  error:   'ERROR  ',
  success: 'SUCCESS',
};

export default function TerminalLog({ logs = [], containerLogs = [], autoScroll = true, height = 400 }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, autoScroll]);

  const allEmpty = logs.length === 0 && containerLogs.length === 0;

  return (
    <div style={{
      background: '#0a0a0b',
      border: '1px solid var(--border)',
      borderRadius: 8,
      height,
      overflowY: 'auto',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      lineHeight: 1.7,
      padding: '12px 16px',
    }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #1f1f23' }}>
        {['#ef4444', '#fbbf24', '#22c55e'].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
        ))}
        <span style={{ fontSize: 11, color: '#52525b', marginLeft: 6 }}>deployment output</span>
      </div>

      {allEmpty ? (
        <div style={{ color: '#52525b', fontSize: 12 }}>
          <span style={{ color: '#10b981' }}>$</span> awaiting deployment logs...
          <span style={{ animation: 'blink 1s step-end infinite', marginLeft: 2 }}>▋</span>
          <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
        </div>
      ) : (
        <>
          {logs.map((log, i) => {
            const style = LEVEL_STYLE[log.level] || LEVEL_STYLE.info;
            const prefix = LEVEL_PREFIX[log.level] || 'INFO   ';
            const ts = log.timestamp
              ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })
              : '';
            return (
              <div key={log.id || i} style={{ display: 'flex', gap: 12, marginBottom: 1 }}>
                <span style={{ color: '#3f3f46', flexShrink: 0, userSelect: 'none' }}>{ts}</span>
                <span style={{ color: style.color, flexShrink: 0, userSelect: 'none' }}>{prefix}</span>
                <span style={{ color: style.color, wordBreak: 'break-all' }}>{log.message}</span>
              </div>
            );
          })}

          {containerLogs.length > 0 && (
            <>
              <div style={{ color: '#3f3f46', margin: '8px 0 4px', borderTop: '1px dashed #1f1f23', paddingTop: 8 }}>
                ── container stdout ──
              </div>
              {containerLogs.map((line, i) => (
                <div key={`cl-${i}`} style={{ color: '#71717a', wordBreak: 'break-all', marginBottom: 1 }}>
                  {line}
                </div>
              ))}
            </>
          )}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

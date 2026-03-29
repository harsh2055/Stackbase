// frontend/components/Functions/ExecutionLogs.jsx
// Table showing recent function execution logs with status, duration, output.

import { Badge } from '../UI';

const STATUS_BADGE = { success: 'green', error: 'red', timeout: 'yellow' };

export default function ExecutionLogs({ logs = [], isLoading }) {
  if (isLoading) {
    return <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 13 }}>Loading logs…</div>;
  }

  if (logs.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
        No executions yet. Trigger the function or click "Test" to run it manually.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {logs.map((log) => (
        <div
          key={log.id}
          style={{
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '10px 14px',
            transition: 'border-color 0.1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: log.output || log.error ? 8 : 0 }}>
            <Badge variant={STATUS_BADGE[log.status] || 'default'}>{log.status}</Badge>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
              {log.trigger}
            </span>
            {log.duration && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
                {log.duration}ms
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {new Date(log.createdAt).toLocaleString()}
            </span>
          </div>

          {/* Output */}
          {log.output && (
            <pre style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: 'var(--text-1)', background: 'var(--bg-1)',
              borderRadius: 4, padding: '6px 10px', margin: 0,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 120, overflow: 'auto',
            }}>
              {log.output}
            </pre>
          )}

          {/* Error */}
          {log.error && (
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: 'var(--red)', background: 'var(--red-dim)',
              borderRadius: 4, padding: '6px 10px', marginTop: log.output ? 4 : 0,
            }}>
              {log.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

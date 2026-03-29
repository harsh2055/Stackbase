// frontend/components/Functions/FunctionCard.jsx
// Card showing a single serverless function with trigger info,
// enable/disable toggle, and action buttons.

import { useState } from 'react';
import { Badge } from '../UI';
import { functionApi, setTokenGetter } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const TRIGGER_STYLE = {
  onInsert:  { color: '#6ee7b7', bg: '#064e3b', label: 'onInsert'  },
  onUpdate:  { color: '#fbbf24', bg: '#451a03', label: 'onUpdate'  },
  onDelete:  { color: '#f87171', bg: '#450a0a', label: 'onDelete'  },
  http:      { color: '#60a5fa', bg: '#1e3a5f', label: 'http'      },
  schedule:  { color: '#a78bfa', bg: '#2e1065', label: 'schedule'  },
};

export default function FunctionCard({ fn, projectId, onEdit, onDelete, onRefresh }) {
  const { token } = useAuth();
  setTokenGetter(() => token);

  const [toggling, setToggling]   = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const trigger = TRIGGER_STYLE[fn.triggerType] || TRIGGER_STYLE.http;

  const handleToggle = async () => {
    setToggling(true);
    try {
      await functionApi.update(projectId, fn.id, { enabled: !fn.enabled });
      onRefresh && onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setLastResult(null);
    try {
      const result = await functionApi.execute(projectId, fn.id, {
        _test: true,
        data: { id: 'test-id', example: 'value' },
      });
      setLastResult(result);
      onRefresh && onRefresh();
    } catch (err) {
      setLastResult({ success: false, error: err.message, output: [] });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: `1px solid ${fn.enabled ? 'var(--border)' : 'var(--border)'}`,
      borderLeft: `3px solid ${fn.enabled ? trigger.color : 'var(--text-3)'}`,
      borderRadius: 8,
      padding: 16,
      opacity: fn.enabled ? 1 : 0.65,
      transition: 'opacity 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{fn.name}</span>
          <span style={{
            background: trigger.bg, color: trigger.color,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, fontWeight: 700,
            padding: '2px 7px', borderRadius: 3,
          }}>
            {trigger.label}
          </span>
          {!fn.enabled && (
            <Badge variant="default">disabled</Badge>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          title={fn.enabled ? 'Disable function' : 'Enable function'}
          style={{
            width: 36, height: 20,
            background: fn.enabled ? 'var(--accent)' : 'var(--bg-4)',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            position: 'relative', transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 2,
            left: fn.enabled ? 18 : 2,
            width: 16, height: 16,
            borderRadius: '50%',
            background: fn.enabled ? '#022c22' : 'var(--text-3)',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Trigger details */}
      <div style={{ marginBottom: 10 }}>
        {fn.description && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>{fn.description}</div>
        )}
        {fn.tableName && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
            table: <span style={{ color: 'var(--text-1)' }}>{fn.tableName}</span>
          </div>
        )}
        {fn.httpPath && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
            path: <span style={{ color: 'var(--blue)' }}>POST /functions/:projectId{fn.httpPath}</span>
          </div>
        )}
        {fn.schedule && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
            schedule: <span style={{ color: 'var(--purple)' }}>{fn.schedule}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {fn._count?.logs || 0} executions
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          timeout: {fn.timeout}ms
        </span>
      </div>

      {/* Last test result */}
      {lastResult && (
        <div style={{
          background: lastResult.success ? 'var(--accent-dim)' : 'var(--red-dim)',
          border: `1px solid ${lastResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)'}`,
          borderRadius: 5, padding: '8px 10px', marginBottom: 10, fontSize: 11,
        }}>
          <div style={{ color: lastResult.success ? 'var(--accent-light)' : 'var(--red)', fontWeight: 500, marginBottom: 4 }}>
            {lastResult.success ? '✓ Executed successfully' : '✗ ' + lastResult.error}
          </div>
          {lastResult.output && lastResult.output.length > 0 && (
            <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-1)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {lastResult.output.join('\n')}
            </pre>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => onEdit && onEdit(fn)}
          style={actionBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-0)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          Edit
        </button>
        <button
          onClick={handleExecute}
          disabled={executing}
          style={{ ...actionBtnStyle, color: executing ? 'var(--text-3)' : 'var(--accent)' }}
          onMouseEnter={(e) => { if (!executing) { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          {executing ? 'Running…' : '▶ Test'}
        </button>
        <button
          onClick={() => onDelete && onDelete(fn)}
          style={{ ...actionBtnStyle, marginLeft: 'auto' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

const actionBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 5, padding: '5px 12px',
  fontSize: 12, color: 'var(--text-2)',
  cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
  transition: 'all 0.1s',
};

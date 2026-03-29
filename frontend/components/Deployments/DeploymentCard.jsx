// frontend/components/Deployments/DeploymentCard.jsx
import { useState } from 'react';
import { Badge, Button, Spinner } from '../UI';
import { deployApi, setTokenGetter } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = {
  pending:  'yellow',
  building: 'yellow',
  running:  'green',
  failed:   'red',
  stopped:  'default',
};

const STATUS_DOT = {
  pending:  { color: '#fbbf24', pulse: true },
  building: { color: '#fbbf24', pulse: true },
  running:  { color: '#10b981', pulse: false },
  failed:   { color: '#f87171', pulse: false },
  stopped:  { color: '#52525b', pulse: false },
};

function StatusDot({ status }) {
  const s = STATUS_DOT[status] || STATUS_DOT.stopped;
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: s.color, flexShrink: 0,
      boxShadow: s.pulse ? `0 0 6px ${s.color}` : 'none',
    }} />
  );
}

export default function DeploymentCard({ deployment, onAction, onViewLogs }) {
  const { token } = useAuth();
  setTokenGetter(() => token);
  const [acting, setActing] = useState(false);

  const handleAction = async (action) => {
    setActing(true);
    try {
      if (action === 'stop')    await deployApi.stop(deployment.id);
      if (action === 'restart') await deployApi.restart(deployment.id);
      onAction && onAction();
    } catch (err) {
      alert(err.message);
    } finally {
      setActing(false);
    }
  };

  const isActive = ['pending', 'building', 'running'].includes(deployment.status);
  const canStop    = deployment.status === 'running';
  const canRestart = ['running', 'stopped', 'failed'].includes(deployment.status);

  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 18,
      borderLeft: `3px solid ${deployment.status === 'running' ? 'var(--accent)' : deployment.status === 'failed' ? 'var(--red)' : 'var(--border)'}`,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot status={deployment.status} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-1)' }}>
            {deployment.id.slice(0, 8)}
          </span>
          <Badge variant={STATUS_BADGE[deployment.status] || 'default'}>
            {deployment.status}
          </Badge>
          {['pending', 'building'].includes(deployment.status) && <Spinner size={12} />}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {new Date(deployment.createdAt).toLocaleString()}
        </div>
      </div>

      {/* API URL */}
      {deployment.apiUrl && (
        <div style={{
          background: 'var(--bg-3)', borderRadius: 6, padding: '8px 12px',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
          </svg>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-light)', flex: 1 }}>
            {deployment.apiUrl}
          </span>
          <button
            onClick={() => { navigator.clipboard.writeText(deployment.apiUrl); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
          >
            copy
          </button>
        </div>
      )}

      {/* Container info */}
      {deployment.containerName && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
          container: {deployment.containerName}
          {deployment.port && <span style={{ marginLeft: 8 }}>port: {deployment.port}</span>}
          <span style={{ marginLeft: 8 }}>provider: {deployment.provider}</span>
        </div>
      )}

      {/* Error message */}
      {deployment.errorMessage && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 5, padding: '7px 10px', fontSize: 12, color: 'var(--red)',
          marginBottom: 10,
        }}>
          {deployment.errorMessage}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <Button size="sm" variant="ghost" onClick={() => onViewLogs && onViewLogs(deployment)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 17L10 11 4 5M12 19h8"/>
          </svg>
          View Logs
        </Button>
        {canRestart && (
          <Button size="sm" variant="outline" onClick={() => handleAction('restart')} disabled={acting}>
            {acting ? <Spinner size={11} /> : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
            )}
            Restart
          </Button>
        )}
        {canStop && (
          <Button size="sm" variant="danger" onClick={() => handleAction('stop')} disabled={acting}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}

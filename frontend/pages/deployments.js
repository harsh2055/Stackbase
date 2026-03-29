// frontend/pages/deployments.js
// Phase 4 — Deployment & Hosting Automation page.
// Shows all deployments for a project, lets users trigger/stop/restart,
// and view terminal-style logs for each deployment.

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AppLayout from '../components/Layout/AppLayout';
import DeploymentCard from '../components/Deployments/DeploymentCard';
import TerminalLog from '../components/Deployments/TerminalLog';
import { Button, Badge, Spinner, Card } from '../components/UI';
import { useProject } from '../hooks/useProjects';
import { useDeployments, useDeploymentLogs } from '../hooks/useProjects';
import { deployApi, setTokenGetter } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import withAuth from '../components/Auth/withAuth';

function LogPanel({ deployment, onClose }) {
  const { logs, containerLogs, isLoading } = useDeploymentLogs(deployment?.id);
  if (!deployment) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-hover)', borderRadius: 12, width: '100%', maxWidth: 820, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Deployment Logs</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
              {deployment.id.slice(0, 8)} · {deployment.status}
              {deployment.apiUrl && <span style={{ color: 'var(--accent-light)', marginLeft: 10 }}>{deployment.apiUrl}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ padding: 16 }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', padding: 20, justifyContent: 'center' }}><Spinner size={14} /> Loading logs...</div>
          ) : (
            <TerminalLog logs={logs} containerLogs={containerLogs} autoScroll height={450} />
          )}
        </div>
      </div>
    </div>
  );
}

function DeploymentsPage() {
  const router = useRouter();
  const { project: projectId } = router.query;
  const { token } = useAuth();
  setTokenGetter(() => token);

  const { project } = useProject(projectId);
  const { deployments, isLoading, mutate: refreshDeployments } = useDeployments(projectId);

  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const [viewingLog, setViewingLog] = useState(null);

  const activeDeployment = deployments.find((d) => d.status === 'running');
  const latestDeployment = deployments[0];

  const handleDeploy = async () => {
    if (!projectId) return;
    setDeploying(true); setDeployError('');
    try {
      const result = await deployApi.deploy(projectId);
      refreshDeployments();
      // Auto-open logs for the new deployment
      setTimeout(() => setViewingLog({ id: result.deployment.id, status: 'building', apiUrl: null }), 500);
    } catch (err) {
      setDeployError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  if (!projectId) {
    return (
      <AppLayout title="Deployments" subtitle="stackbase / deployments">
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-2)' }}>
          <div style={{ marginBottom: 12 }}>Select a project to manage deployments</div>
          <Link href="/"><Button variant="outline">Go to Projects</Button></Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Deployments"
      subtitle={`${project?.name || '...'} / deployments`}
      activeProject={project}
      actions={
        <Button variant="primary" onClick={handleDeploy} disabled={deploying}>
          {deploying ? <Spinner size={13} /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          )}
          {deploying ? 'Deploying...' : 'Deploy Project'}
        </Button>
      }
    >
      {/* Status banner */}
      {activeDeployment && (
        <div style={{
          background: 'var(--accent-dim)', border: '1px solid rgba(110,231,183,0.2)',
          borderRadius: 8, padding: '12px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-light)' }}>Live deployment running</span>
            <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 12, fontFamily: 'JetBrains Mono, monospace' }}>
              {activeDeployment.apiUrl}
            </span>
          </div>
          <button onClick={() => navigator.clipboard.writeText(activeDeployment.apiUrl)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
            copy URL
          </button>
        </div>
      )}

      {/* Error */}
      {deployError && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>
          {deployError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Left — deployment history */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Deployment History ({deployments.length})
            </div>
            <button onClick={() => refreshDeployments()} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12 }}>
              refresh
            </button>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', padding: 32, justifyContent: 'center' }}><Spinner /> Loading deployments...</div>
          ) : deployments.length === 0 ? (
            <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border)', borderRadius: 10, padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginBottom: 12, opacity: 0.4 }}>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No deployments yet</div>
              <div style={{ fontSize: 12, marginBottom: 20 }}>Click "Deploy Project" to launch your first deployment</div>
              <Button variant="primary" onClick={handleDeploy} disabled={deploying}>
                {deploying ? 'Deploying...' : 'Deploy Now'}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deployments.map((dep) => (
                <DeploymentCard
                  key={dep.id}
                  deployment={dep}
                  onAction={refreshDeployments}
                  onViewLogs={(d) => setViewingLog(d)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — live log preview + info */}
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
              Deployment Info
            </div>
            {[
              ['Provider', process.env.NEXT_PUBLIC_DEPLOY_PROVIDER || 'local (Docker)'],
              ['Status', activeDeployment ? 'running' : deployments[0]?.status || 'not deployed'],
              ['Deployments', deployments.length],
              ['Project', project?.name || '...'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: label === 'Status' && val === 'running' ? 'var(--accent)' : 'var(--text-0)' }}>{val}</span>
              </div>
            ))}
          </Card>

          {/* Latest log preview */}
          {latestDeployment && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Latest Logs
                </div>
                <button onClick={() => setViewingLog(latestDeployment)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11 }}>
                  expand →
                </button>
              </div>
              <TerminalLog logs={[]} containerLogs={[]} height={180} autoScroll={false} />
            </Card>
          )}

          {/* Usage */}
          <Card style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
              How to Deploy
            </div>
            {[
              ['1', 'Create tables in Database Builder'],
              ['2', 'Click "Deploy Project" above'],
              ['3', 'Watch the build log in real time'],
              ['4', 'Copy your live API URL'],
              ['5', 'Use x-api-key header to access APIs'],
            ].map(([n, text]) => (
              <div key={n} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 12 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0, minWidth: 16 }}>{n}.</span>
                <span style={{ color: 'var(--text-2)' }}>{text}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Log modal */}
      {viewingLog && (
        <LogPanel deployment={viewingLog} onClose={() => setViewingLog(null)} />
      )}
    </AppLayout>
  );
}

export default withAuth(DeploymentsPage);

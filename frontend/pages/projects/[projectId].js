// frontend/pages/projects/[projectId].js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AppLayout from '../../components/Layout/AppLayout';
import { Button, Badge, Spinner, Card, ErrorMessage } from '../../components/UI';
import { useProject, useApiKeys, useDeployments } from '../../hooks/useProjects';
import { apiKeyApi, deployApi, setTokenGetter } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import withAuth from '../../components/Auth/withAuth';

const METHOD_STYLE = { GET: { bg: '#064e3b', color: '#6ee7b7' }, POST: { bg: '#1e3a5f', color: '#60a5fa' }, PUT: { bg: '#451a03', color: '#fbbf24' }, DELETE: { bg: '#450a0a', color: '#f87171' } };
const STATUS_COLOR = { running: 'var(--accent)', building: 'var(--yellow)', pending: 'var(--yellow)', failed: 'var(--red)', stopped: 'var(--text-3)' };

function ProjectDetailPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const { token } = useAuth();
  setTokenGetter(() => token);

  const { project, isLoading, mutate: refreshProject } = useProject(projectId);
  const { keys, mutate: refreshKeys } = useApiKeys(projectId);
  const { deployments, mutate: refreshDeploys } = useDeployments(projectId);

  const [newKeyName, setNewKeyName] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [freshKey, setFreshKey] = useState(null);
  const [keyError, setKeyError] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployMsg, setDeployMsg] = useState('');

  const activeDeployment = deployments.find((d) => d.status === 'running');

  const handleGenerateKey = async () => {
    setKeyError(''); setFreshKey(null);
    setGeneratingKey(true);
    try {
      const result = await apiKeyApi.generate(projectId, { name: newKeyName || 'New Key' });
      setFreshKey(result.apiKey); setNewKeyName(''); refreshKeys();
    } catch (err) { setKeyError(err.message); }
    finally { setGeneratingKey(false); }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm('Revoke this API key?')) return;
    try { await apiKeyApi.revoke(projectId, keyId); refreshKeys(); } catch (err) { alert(err.message); }
  };

  const handleDeploy = async () => {
    setDeploying(true); setDeployMsg('');
    try {
      await deployApi.deploy(projectId);
      setDeployMsg('Deployment started! View progress in Deployments tab.');
      refreshDeploys();
    } catch (err) { setDeployMsg(err.message); }
    finally { setDeploying(false); }
  };

  if (isLoading) return <AppLayout title="Project"><div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 48, color: 'var(--text-2)', justifyContent: 'center' }}><Spinner size={18} /> Loading...</div></AppLayout>;
  if (!project) return <AppLayout title="Not Found"><div style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}><div style={{ marginBottom: 12 }}>Project not found</div><Link href="/"><Button variant="outline">Back</Button></Link></div></AppLayout>;

  const tables = project.tables || [];
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  return (
    <AppLayout title={project.name} subtitle={`stackbase / projects / ${project.id.slice(0,8)}`} activeProject={project}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/database?project=${projectId}`}><Button size="sm" variant="outline">+ Table</Button></Link>
          <Link href={`/deployments?project=${projectId}`}><Button size="sm" variant="primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Deploy
          </Button></Link>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Left */}
        <div>
          {/* Stats */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' }}>{project.name}</h1>
              <Badge variant="green">active</Badge>
            </div>
            {project.description && <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>{project.description}</p>}

            {/* Deployment status strip */}
            {activeDeployment && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-dim)', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 5px var(--accent)' }} />
                <span style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 500 }}>Live:</span>
                <span style={{ fontSize: 12, color: 'var(--accent-light)', fontFamily: 'JetBrains Mono, monospace' }}>{activeDeployment.apiUrl}</span>
                <button onClick={() => navigator.clipboard.writeText(activeDeployment.apiUrl)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, marginLeft: 4, fontFamily: 'JetBrains Mono, monospace' }}>copy</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 24 }}>
              {[['Tables', tables.length], ['APIs', tables.length * 5], ['Deployments', deployments.length]].map(([l, v]) => (
                <div key={l}><div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{v}</div><div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div></div>
              ))}
            </div>
          </div>

          {/* Deploy button */}
          {deployMsg && (
            <div style={{ background: deployMsg.includes('started') ? 'var(--accent-dim)' : 'var(--red-dim)', border: `1px solid ${deployMsg.includes('started') ? 'rgba(110,231,183,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius: 6, padding: '10px 14px', fontSize: 13, color: deployMsg.includes('started') ? 'var(--accent-light)' : 'var(--red)', marginBottom: 16 }}>
              {deployMsg}
            </div>
          )}

          {/* Tables */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Tables & APIs</div>
              <Link href={`/database?project=${projectId}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Add →</Link>
            </div>
            {tables.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 13 }}>
                No tables yet. <Link href={`/database?project=${projectId}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>Create one →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tables.map((table) => {
                  const pg = table.pgTableName || `prj_${projectId.replace(/-/g,'').slice(0,8)}_${table.tableName}`;
                  return (
                    <div key={table.id} style={{ background: 'var(--bg-3)', borderRadius: 6, border: '1px solid var(--border)', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 500 }}>{table.tableName}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{Array.isArray(table.columns) ? table.columns.length : 0} cols</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {['GET','POST','PUT','DELETE'].map((m) => <span key={m} style={{ background: METHOD_STYLE[m].bg, color: METHOD_STYLE[m].color, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 2 }}>{m}</span>)}
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>/api/{pg}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right — API Keys */}
        <div>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>API Keys</div>
            {freshKey && (
              <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(110,231,183,0.2)', borderRadius: 6, padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 500, marginBottom: 5 }}>Save — shown once only</div>
                <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--accent-light)', wordBreak: 'break-all', background: 'rgba(0,0,0,0.3)', padding: '4px 6px', borderRadius: 4, display: 'block' }}>{freshKey.key}</code>
                <button onClick={() => setFreshKey(null)} style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 5 }}>Dismiss</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Key name" style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text-0)', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
              <Button size="sm" variant="primary" onClick={handleGenerateKey} disabled={generatingKey}>{generatingKey ? <Spinner size={12} /> : 'Generate'}</Button>
            </div>
            <ErrorMessage message={keyError} />
            {keys.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>No keys yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {keys.map((key) => (
                  <div key={key.id} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{key.name}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-3)' }}>{key.keyMasked}</div>
                    </div>
                    <button onClick={() => handleRevokeKey(key.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px 4px' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick links */}
          <Card style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Quick Links</div>
            {[
              ['Database Builder', `/database?project=${projectId}`],
              ['Deployments', `/deployments?project=${projectId}`],
              ['API Explorer', `/apis?project=${projectId}`],
            ].map(([label, href]) => (
              <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-1)', fontSize: 13 }}>
                {label}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default withAuth(ProjectDetailPage);

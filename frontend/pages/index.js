// frontend/pages/index.js
import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '../components/Layout/AppLayout';
import { Button, Badge, Spinner, ErrorMessage } from '../components/UI';
import { useProjects } from '../hooks/useProjects';
import { projectApi, setTokenGetter } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import withAuth from '../components/Auth/withAuth';

function ProjectsPage() {
  const { user, token } = useAuth();
  setTokenGetter(() => token);
  const { projects, isLoading, mutate } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newKey, setNewKey] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true); setCreateError('');
    try {
      const result = await projectApi.create({ name, description });
      setNewKey(result.apiKey);
      setName(''); setDescription('');
      setShowForm(false);
      mutate();
    } catch (err) { setCreateError(err.message); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id, pName) => {
    if (!confirm(`Delete "${pName}" and all its data?`)) return;
    try { await projectApi.delete(id); mutate(); } catch (err) { alert(err.message); }
  };

  return (
    <AppLayout title="Projects" subtitle={`stackbase / ${user?.email || ''}`} actions={
      <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        New Project
      </Button>
    }>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 4 }}>
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          {projects.length} project{projects.length !== 1 ? 's' : ''} · Phase 4 — Deployment & Hosting
        </p>
      </div>

      {newKey && (
        <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(110,231,183,0.2)', borderRadius: 8, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-light)', marginBottom: 6 }}>✓ Project created — save your API key now</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>This key will not be shown again.</div>
            <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-light)', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 4, display: 'inline-block' }}>{newKey.key}</code>
          </div>
          <button onClick={() => setNewKey(null)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {showForm && (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-hover)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16 }}>New Project</div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Project Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Car Rental Backend" required style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }} />
              </div>
            </div>
            <ErrorMessage message={createError} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button
  type="submit"   // 🔥 ADD THIS
  variant="primary"
  size="sm"
  disabled={creating}
>
  {creating ? <Spinner size={12} /> : null}
  {creating ? 'Creating...' : 'Create'}
</Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setCreateError(''); }}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', padding: 40, justifyContent: 'center' }}><Spinner /> Loading...</div>
      ) : projects.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border)', borderRadius: 10, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No projects yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>Create a project to start building backend APIs</div>
          <Button variant="primary" onClick={() => setShowForm(true)}>Create Project</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map((project) => (
            <div key={project.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, transition: 'border-color 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Badge variant="green">active</Badge>
                  <button onClick={() => handleDelete(project.id, project.name)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.2px', marginBottom: 4 }}>{project.name}</div>
              {project.description && <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{project.description}</div>}
              <div style={{ display: 'flex', gap: 16, marginBottom: 14, marginTop: 4 }}>
                {[['Tables', project.tableCount], ['APIs', project.tableCount * 5], ['Keys', project.apiKeyCount]].map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{v}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>{l}</div></div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{new Date(project.createdAt).toLocaleDateString()}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link href={`/functions?project=${project.id}`}><Button size="sm" variant="outline">Functions</Button></Link>
                  <Link href={`/realtime?project=${project.id}`}><Button size="sm" variant="outline">Realtime</Button></Link>
                  <Link href={`/projects/${project.id}`}><Button size="sm" variant="primary">Open</Button></Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' };
const inputStyle = { width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-0)', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif', transition: 'border-color 0.15s' };

export default withAuth(ProjectsPage);

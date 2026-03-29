// frontend/pages/apis.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AppLayout from '../components/Layout/AppLayout';
import { Badge, Spinner, Button } from '../components/UI';
import { useProject, useProjectTables } from '../hooks/useProjects';
import { useAuth } from '../context/AuthContext';
import { setTokenGetter } from '../lib/api';
import withAuth from '../components/Auth/withAuth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const METHOD_STYLE = { GET: { bg: '#064e3b', color: '#6ee7b7' }, POST: { bg: '#1e3a5f', color: '#60a5fa' }, PUT: { bg: '#451a03', color: '#fbbf24' }, DELETE: { bg: '#450a0a', color: '#f87171' } };

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ background: 'none', border: 'none', color: copied ? 'var(--accent)' : 'var(--text-3)', cursor: 'pointer', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{copied ? '✓' : 'copy'}</button>;
}

function APIsPage() {
  const router = useRouter();
  const { project: projectId } = router.query;
  const { token } = useAuth();
  setTokenGetter(() => token);
  const { project } = useProject(projectId);
  const { tables, isLoading } = useProjectTables(projectId);

  if (!projectId) return (
    <AppLayout title="API Explorer" subtitle="stackbase / apis">
      <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-2)' }}>
        <div style={{ marginBottom: 12 }}>Select a project to view its APIs</div>
        <Link href="/"><Button variant="outline">Go to Projects</Button></Link>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title="API Explorer" subtitle={`${project?.name || '...'} / apis`} activeProject={project}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 4 }}>API Explorer</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{tables.length * 5} endpoints · authenticate with <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-light)' }}>x-api-key</code> header</p>
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', padding: 40, justifyContent: 'center' }}><Spinner /> Loading...</div>
      ) : tables.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-2)', background: 'var(--bg-2)', borderRadius: 10, border: '1px dashed var(--border)' }}>
          <div style={{ marginBottom: 12 }}>No tables yet</div>
          <Link href={`/database?project=${projectId}`}><Button variant="primary">Open Database Builder</Button></Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tables.map((table) => {
            const pg = table.pgTableName || table.tableName;
            const endpoints = [
              { method: 'GET', path: `/api/${pg}`, desc: 'List all records' },
              { method: 'GET', path: `/api/${pg}/:id`, desc: 'Get record by id' },
              { method: 'POST', path: `/api/${pg}`, desc: 'Create record' },
              { method: 'PUT', path: `/api/${pg}/:id`, desc: 'Update record' },
              { method: 'DELETE', path: `/api/${pg}/:id`, desc: 'Delete record' },
            ];
            return (
              <div key={table.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-3)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v5c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 10v4c0 1.66 4 3 9 3s9-1.34 9-3v-4"/></svg>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 500 }}>{table.tableName}</span>
                  <Badge variant="green">5 endpoints</Badge>
                  <span style={{ flex: 1 }} />
                  <CopyBtn text={`${BASE_URL}/api/${pg}`} />
                </div>
                {endpoints.map((ep) => {
                  const s = METHOD_STYLE[ep.method];
                  return (
                    <div key={`${ep.method}${ep.path}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-3)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                      <span style={{ background: s.bg, color: s.color, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 3, minWidth: 52, textAlign: 'center', flexShrink: 0 }}>{ep.method}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-0)', flex: 1 }}>{ep.path}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 140 }}>{ep.desc}</span>
                      <CopyBtn text={`${BASE_URL}${ep.path}`} />
                    </div>
                  );
                })}
                <div style={{ padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(Array.isArray(table.columns) ? table.columns : []).map((col) => (
                    <span key={col.name} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 3 }}>{col.name}:{col.type}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

export default withAuth(APIsPage);

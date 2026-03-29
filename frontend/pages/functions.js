// frontend/pages/functions.js
// Phase 7 — Serverless Functions page.
// Lists all functions for a project, allows create/edit/delete/test.
// Right panel shows execution logs for the selected function.

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AppLayout from '../components/Layout/AppLayout';
import FunctionCard from '../components/Functions/FunctionCard';
import FunctionForm from '../components/Functions/FunctionForm';
import ExecutionLogs from '../components/Functions/ExecutionLogs';
import { Button, Spinner, Card } from '../components/UI';
import { useProject, useProjectTables } from '../hooks/useProjects';
import { useFunctions, useFunctionLogs } from '../hooks/useProjects';
import { functionApi, setTokenGetter } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import withAuth from '../components/Auth/withAuth';

function LogsPanel({ projectId, fn }) {
  const { logs, isLoading } = useFunctionLogs(projectId, fn?.id);
  if (!fn) return null;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
        Execution Logs — {fn.name}
      </div>
      <ExecutionLogs logs={logs} isLoading={isLoading} />
    </div>
  );
}

function FunctionsPage() {
  const router = useRouter();
  const { project: projectId } = router.query;
  const { token } = useAuth();
  setTokenGetter(() => token);

  const { project }  = useProject(projectId);
  const { tables }   = useProjectTables(projectId);
  const { functions, isLoading, mutate: refreshFunctions } = useFunctions(projectId);

  const [showForm,    setShowForm]    = useState(false);
  const [editingFn,   setEditingFn]   = useState(null);
  const [selectedFn,  setSelectedFn]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [activeTab,   setActiveTab]   = useState('functions'); // functions | logs

  if (!projectId) {
    return (
      <AppLayout title="Functions" subtitle="stackbase / functions">
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-2)' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚡</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Select a project first</div>
          <Link href="/"><Button variant="outline">Go to Projects</Button></Link>
        </div>
      </AppLayout>
    );
  }

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await functionApi.create(projectId, payload);
      refreshFunctions();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      await functionApi.update(projectId, editingFn.id, payload);
      refreshFunctions();
      setEditingFn(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fn) => {
    if (!confirm(`Delete function "${fn.name}"? This cannot be undone.`)) return;
    try {
      await functionApi.delete(projectId, fn.id);
      if (selectedFn?.id === fn.id) setSelectedFn(null);
      refreshFunctions();
    } catch (err) {
      alert(err.message);
    }
  };

  // Group functions by trigger type
  const grouped = {
    database: functions.filter((f) => ['onInsert','onUpdate','onDelete'].includes(f.triggerType)),
    http:     functions.filter((f) => f.triggerType === 'http'),
    schedule: functions.filter((f) => f.triggerType === 'schedule'),
  };

  return (
    <AppLayout
      title="Functions"
      subtitle={`${project?.name || '...'} / functions`}
      activeProject={project}
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Function
        </Button>
      }
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' }}>Serverless Functions</h1>
          <span style={{
            background: 'var(--purple-dim)', border: '1px solid rgba(167,139,250,0.3)',
            borderRadius: 12, padding: '2px 10px', fontSize: 11, color: 'var(--purple)', fontWeight: 500,
          }}>Phase 7</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Write JavaScript that runs automatically on database events, HTTP calls, or schedules.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          ['Total Functions', functions.length],
          ['DB Triggers', grouped.database.length],
          ['HTTP Triggers', grouped.http.length],
          ['Schedules', grouped.schedule.length],
        ].map(([label, val]) => (
          <div key={label} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {[['functions', 'Functions'], ['logs', selectedFn ? `Logs — ${selectedFn.name}` : 'Logs']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '7px 16px', marginBottom: -1,
            fontSize: 13, fontWeight: activeTab === tab ? 500 : 400,
            color: activeTab === tab ? 'var(--text-0)' : 'var(--text-2)',
            cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
          }}>{label}</button>
        ))}
      </div>

      {/* Functions tab */}
      {activeTab === 'functions' && (
        <>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', padding: 40, justifyContent: 'center' }}>
              <Spinner /> Loading functions…
            </div>
          ) : functions.length === 0 ? (
            <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--border)', borderRadius: 10, padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No functions yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
                Create your first serverless function to run code on database events
              </div>
              <Button variant="primary" onClick={() => setShowForm(true)}>Create Function</Button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {functions.map((fn) => (
                <div key={fn.id} onClick={() => { setSelectedFn(fn); setActiveTab('logs'); }} style={{ cursor: 'pointer' }}>
                  <FunctionCard
                    fn={fn}
                    projectId={projectId}
                    onEdit={(f) => { setEditingFn(f); }}
                    onDelete={handleDelete}
                    onRefresh={refreshFunctions}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Quick guide */}
          {functions.length === 0 && (
            <Card style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
                Trigger Types
              </div>
              {[
                ['onInsert', '#6ee7b7', 'Fires after a record is inserted into a table'],
                ['onUpdate', '#fbbf24', 'Fires after a record is updated'],
                ['onDelete', '#f87171', 'Fires after a record is deleted'],
                ['http',     '#60a5fa', 'Triggered by POST /functions/:projectId/:path'],
                ['schedule', '#a78bfa', 'Runs on a time interval (30s, 5m, 1h, etc.)'],
              ].map(([type, color, desc]) => (
                <div key={type} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
                    color, minWidth: 80,
                  }}>{type}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{desc}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {/* Logs tab */}
      {activeTab === 'logs' && (
        selectedFn ? (
          <LogsPanel projectId={projectId} fn={selectedFn} />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 13 }}>
            Click a function card in the Functions tab to view its execution logs
          </div>
        )
      )}

      {/* Create form */}
      {showForm && (
        <FunctionForm
          tables={tables}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
          loading={saving}
        />
      )}

      {/* Edit form */}
      {editingFn && (
        <FunctionForm
          fn={editingFn}
          tables={tables}
          onSubmit={handleUpdate}
          onClose={() => setEditingFn(null)}
          loading={saving}
        />
      )}
    </AppLayout>
  );
}

export default withAuth(FunctionsPage);

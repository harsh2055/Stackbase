// frontend/pages/database.js
// Project-scoped Database Builder — Phase 3 version.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../components/Layout/AppLayout';
import ColumnEditor from '../components/ColumnEditor/ColumnEditor';
import APIInspector from '../components/APIInspector/APIInspector';
import { Button, Badge, Spinner, ErrorMessage, SuccessMessage } from '../components/UI';
import { useProject, useProjectTables } from '../hooks/useProjects';
import { tableApi, setTokenGetter } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import withAuth from '../components/Auth/withAuth';

function DatabasePage() {
  const router = useRouter();
  const { project: projectId } = router.query;
  const { token } = useAuth();
  setTokenGetter(() => token);

  const { project } = useProject(projectId);
  const { tables, isLoading, mutate: refreshTables } = useProjectTables(projectId);

  const [selectedTable, setSelectedTable] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState([{ id: 1, name: 'name', type: 'text', nullable: true, unique: false }]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Auto-select table from URL
  useEffect(() => {
    if (router.query.table && tables.length > 0) {
      const found = tables.find((t) => t.tableName === router.query.table);
      if (found) setSelectedTable(found);
    }
  }, [router.query.table, tables]);

  const handleCreateTable = async () => {
    if (!projectId) { setCreateError('Select a project first'); return; }
    if (!tableName.trim()) { setCreateError('Table name is required'); return; }
    if (columns.some((c) => !c.name.trim())) { setCreateError('All columns need a name'); return; }

    setCreating(true); setCreateError(''); setCreateSuccess('');
    try {
      const result = await tableApi.create(projectId, {
        tableName,
        columns: columns.map(({ name, type, nullable, unique }) => ({ name, type, nullable, unique })),
      });
      setCreateSuccess(`Table "${result.table.tableName}" created with ${result.generatedApis.length} APIs`);
      setTableName(''); setColumns([{ id: 1, name: 'name', type: 'text', nullable: true, unique: false }]);
      refreshTables();
      setTimeout(() => { setShowBuilder(false); setCreateSuccess(''); }, 1400);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!selectedTable || !projectId) return;
    if (!confirm(`Delete table "${selectedTable.tableName}" and all data?`)) return;
    setDeleting(true);
    try {
      await tableApi.delete(projectId, selectedTable.tableName);
      setSelectedTable(null);
      refreshTables();
    } catch (err) { alert(err.message); }
    finally { setDeleting(false); }
  };

  const columns_ = Array.isArray(selectedTable?.columns) ? selectedTable.columns : [];
  const userCols = columns_.filter((c) => !['id', 'created_at', 'updated_at'].includes(c.name));
  const pgTableName = selectedTable?.pgTableName;

  if (!projectId) {
    return (
      <AppLayout title="Database Builder" subtitle="stackbase / database">
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-2)' }}>
          <div style={{ fontSize: 15, marginBottom: 12 }}>Select a project first</div>
          <Button variant="outline" onClick={() => router.push('/')}>Go to Projects</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Database Builder"
      subtitle={`${project?.name || '...'} / database`}
      activeProject={project}
      actions={
        <Button variant="primary" size="sm" onClick={() => setShowBuilder(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Table
        </Button>
      }
    >
      <div style={{
        display: 'grid', gridTemplateColumns: '200px 1fr 280px', gap: 0,
        height: 'calc(100vh - 140px)', border: '1px solid var(--border)',
        borderRadius: 10, overflow: 'hidden',
      }}>
        {/* Table list */}
        <div style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Tables</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{tables.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {isLoading ? (
              <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)' }}>
                <Spinner size={12} /><span style={{ fontSize: 12 }}>Loading...</span>
              </div>
            ) : tables.length === 0 ? (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
                No tables.<br />
                <button onClick={() => setShowBuilder(true)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, marginTop: 4 }}>
                  Create one →
                </button>
              </div>
            ) : (
              tables.map((table) => {
                const isActive = selectedTable?.tableName === table.tableName;
                return (
                  <div key={table.id} onClick={() => setSelectedTable(table)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
                    cursor: 'pointer', color: isActive ? 'var(--text-0)' : 'var(--text-1)',
                    background: isActive ? 'var(--bg-3)' : 'transparent',
                    borderRight: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    fontSize: 13, fontFamily: 'JetBrains Mono, monospace', transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-0)'; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-1)'; } }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ opacity: 0.5, flexShrink: 0 }}>
                      <rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="17" width="18" height="4" rx="1"/>
                    </svg>
                    {table.tableName}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Schema editor */}
        <div style={{ background: 'var(--bg-1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                {selectedTable ? (
                  <><span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-0)', textTransform: 'none' }}>{selectedTable.tableName}</span> / Schema</>
                ) : 'Schema Editor'}
              </span>
              {selectedTable && <Badge variant="green">active</Badge>}
            </div>
            {selectedTable && (
              <Button size="sm" variant="danger" onClick={handleDeleteTable} disabled={deleting}>
                {deleting ? <Spinner size={11} /> : 'Drop Table'}
              </Button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {!selectedTable ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-3)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v5c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 10v5c0 1.66 4 3 9 3s9-1.34 9-3v-5"/></svg>
                <div style={{ fontSize: 13, textAlign: 'center' }}>Select a table or create a new one</div>
                <Button variant="outline" size="sm" onClick={() => setShowBuilder(true)}>Create Table</Button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>
                  Columns ({columns_.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 70px 70px', gap: 8, padding: '5px 10px 8px', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <span>Name</span><span>Type</span><span>Nullable</span><span>Flags</span>
                </div>
                {columns_.map((col) => (
                  <div key={col.name} style={{
                    display: 'grid', gridTemplateColumns: '1fr 120px 70px 70px', gap: 8,
                    padding: '8px 10px', borderRadius: 5, alignItems: 'center', marginBottom: 2, transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>{col.name}</span>
                      {col.isPrimary && <Badge variant="green">PK</Badge>}
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--blue)' }}>{col.type}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{col.nullable === false ? 'no' : 'yes'}</span>
                    <div>{col.unique && <Badge variant="yellow">unique</Badge>}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* API Inspector */}
        <div style={{ background: 'var(--bg-2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.7px', flexShrink: 0 }}>
            API Inspector
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <APIInspector tableName={pgTableName} columns={userCols} />
          </div>
        </div>
      </div>

      {/* Create Table Modal */}
      {showBuilder && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowBuilder(false); }} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
        }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-hover)', borderRadius: 12, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Create New Table</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>in project: {project?.name}</div>
              </div>
              <button onClick={() => setShowBuilder(false)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Table Name
                </label>
                <input
                  value={tableName} onChange={(e) => setTableName(e.target.value)}
                  placeholder="e.g. cars, users, bookings"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 14, color: 'var(--text-0)', outline: 'none', fontFamily: 'JetBrains Mono, monospace', maxWidth: 320, width: '100%' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Columns
                </label>
                <ColumnEditor columns={columns} onChange={setColumns} />
              </div>
              <ErrorMessage message={createError} />
              <SuccessMessage message={createSuccess} />
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{columns.length} column{columns.length !== 1 ? 's' : ''} · 5 CRUD APIs generated</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => { setShowBuilder(false); setCreateError(''); setCreateSuccess(''); }}>Cancel</Button>
                <Button variant="primary" onClick={handleCreateTable} disabled={creating}>
                  {creating ? <Spinner size={13} /> : null}
                  {creating ? 'Creating...' : 'Create Table'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default withAuth(DatabasePage);

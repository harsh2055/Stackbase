// frontend/components/TableBuilder/RelationshipManager.jsx
// Panel for defining relationships between tables.
// Shown as a collapsible section in the Database page.

import { useState } from 'react';
import { relationshipApi } from '../../lib/api';
import { Button, Select, Badge, ErrorMessage, SuccessMessage, Spinner } from '../UI';

const REL_TYPES = [
  { value: 'many-to-one',  label: 'Many → One  (FK)' },
  { value: 'one-to-many',  label: 'One → Many' },
  { value: 'one-to-one',   label: 'One → One' },
  { value: 'many-to-many', label: 'Many ↔ Many' },
];

const REL_BADGE = {
  'many-to-one':  'blue',
  'one-to-many':  'green',
  'one-to-one':   'purple',
  'many-to-many': 'yellow',
};

export default function RelationshipManager({ tables, relationships, onRefresh }) {
  const [fromTable, setFromTable]   = useState('');
  const [fromColumn, setFromColumn] = useState('');
  const [toTable, setToTable]       = useState('');
  const [toColumn, setToColumn]     = useState('id');
  const [type, setType]             = useState('many-to-one');
  const [loading, setLoading]       = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const handleCreate = async () => {
    setError(''); setSuccess('');
    if (!fromTable || !fromColumn || !toTable || !toColumn) {
      setError('All fields are required');
      return;
    }
    if (fromTable === toTable) {
      setError('Cannot create a self-referencing relationship here');
      return;
    }
    setLoading(true);
    try {
      await relationshipApi.create({ fromTable, fromColumn, toTable, toColumn, type });
      setSuccess(`Relationship created: ${fromTable}.${fromColumn} → ${toTable}.${toColumn}`);
      setFromTable(''); setFromColumn(''); setToTable(''); setToColumn('id');
      onRefresh && onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await relationshipApi.delete(id);
      onRefresh && onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      {/* Create form */}
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-1)',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: 14,
          }}
        >
          Add Relationship
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>From Table</div>
            <Select value={fromTable} onChange={(e) => setFromTable(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select table</option>
              {tables.map((t) => <option key={t.tableName} value={t.tableName}>{t.tableName}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>FK Column</div>
            <input
              value={fromColumn}
              onChange={(e) => setFromColumn(e.target.value)}
              placeholder="e.g. user_id"
              style={{
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '7px 10px', fontSize: 12,
                color: 'var(--text-0)', outline: 'none', width: '100%',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>To Table</div>
            <Select value={toTable} onChange={(e) => setToTable(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select table</option>
              {tables.map((t) => <option key={t.tableName} value={t.tableName}>{t.tableName}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Ref Column</div>
            <input
              value={toColumn}
              onChange={(e) => setToColumn(e.target.value)}
              placeholder="id"
              style={{
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '7px 10px', fontSize: 12,
                color: 'var(--text-0)', outline: 'none', width: '100%',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Type</div>
            <Select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%' }}>
              {REL_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </div>
          <Button onClick={handleCreate} variant="primary" disabled={loading} style={{ marginTop: 18 }}>
            {loading ? <Spinner size={13} /> : 'Add'}
          </Button>
        </div>

        <ErrorMessage message={error} />
        <SuccessMessage message={success} />
      </div>

      {/* Existing relationships */}
      {relationships.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: 8,
            }}
          >
            Defined Relationships ({relationships.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {relationships.map((rel) => (
              <div
                key={rel.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                }}
              >
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-0)' }}>
                  {rel.fromTable}
                  <span style={{ color: 'var(--text-3)' }}>.</span>
                  <span style={{ color: 'var(--accent-light)' }}>{rel.fromColumn}</span>
                </span>
                <span style={{ color: 'var(--text-3)' }}>→</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-0)' }}>
                  {rel.toTable}
                  <span style={{ color: 'var(--text-3)' }}>.</span>
                  <span style={{ color: 'var(--blue)' }}>{rel.toColumn}</span>
                </span>
                <Badge variant={REL_BADGE[rel.type] || 'default'}>{rel.type}</Badge>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => handleDelete(rel.id)}
                  disabled={deleting === rel.id}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--text-3)',
                    cursor: 'pointer', padding: '2px 4px', borderRadius: 4,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
                >
                  {deleting === rel.id ? <Spinner size={12} /> : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

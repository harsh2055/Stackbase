// frontend/components/TableBuilder/TableBuilder.jsx
// Modal overlay for creating a new table.
// Contains the table name input and ColumnEditor.
// On submit: calls POST /api/tables/create and triggers route refresh.

import { useState } from 'react';
import { tableApi } from '../../lib/api';
import ColumnEditor from '../ColumnEditor/ColumnEditor';
import { Button, Input, ErrorMessage, SuccessMessage, Spinner } from '../UI';

export default function TableBuilder({ onClose, onCreated }) {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState([
    { id: 1, name: 'name', type: 'text', nullable: true, unique: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!tableName.trim()) {
      setError('Table name is required');
      return;
    }
    if (columns.some((c) => !c.name.trim())) {
      setError('All columns must have a name');
      return;
    }

    setLoading(true);
    try {
      const result = await tableApi.create({
        tableName: tableName.trim(),
        columns: columns.map((c) => ({
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          unique: c.unique,
        })),
      });
      setSuccess(`Table "${result.table.tableName}" created with ${result.generatedApis.length} APIs`);
      setTimeout(() => {
        onCreated && onCreated(result.table);
        onClose && onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  // Click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose && onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border-hover)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 760,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' }}>
              Create New Table
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              Define columns and CRUD APIs are generated automatically
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Table name */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-1)',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              Table Name
            </label>
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g. cars, users, bookings"
              style={{ fontSize: 14, fontFamily: 'JetBrains Mono, monospace', maxWidth: 320 }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
              Lowercase letters, numbers, underscores only
            </div>
          </div>

          {/* Columns */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-1)',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              Columns
            </label>
            <ColumnEditor columns={columns} onChange={setColumns} />
          </div>

          <ErrorMessage message={error} />
          <SuccessMessage message={success} />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {columns.length} column{columns.length !== 1 ? 's' : ''} defined
            {' · '}
            5 CRUD APIs will be generated
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="primary" disabled={loading}>
              {loading ? <Spinner size={13} /> : null}
              {loading ? 'Creating...' : 'Create Table'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

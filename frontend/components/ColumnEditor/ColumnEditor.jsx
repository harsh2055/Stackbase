// frontend/components/ColumnEditor/ColumnEditor.jsx
// The column editor used inside the Table Builder.
// Allows adding, editing types, toggling nullable/unique, and deleting columns.

import { Button, Input, Select, Badge } from '../UI';

const COLUMN_TYPES = [
  'text', 'string', 'integer', 'number', 'bigint', 'float',
  'decimal', 'boolean', 'date', 'timestamp', 'uuid', 'json',
];

const TYPE_COLORS = {
  text: 'blue', string: 'blue',
  integer: 'purple', number: 'purple', bigint: 'purple',
  float: 'purple', decimal: 'purple',
  boolean: 'yellow',
  date: 'green', timestamp: 'green',
  uuid: 'default',
  json: 'red',
};

export default function ColumnEditor({ columns, onChange }) {
  const addColumn = () => {
    onChange([
      ...columns,
      { id: Date.now(), name: '', type: 'text', nullable: true, unique: false },
    ]);
  };

  const updateColumn = (id, field, value) => {
    onChange(columns.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeColumn = (id) => {
    onChange(columns.filter((c) => c.id !== id));
  };

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 80px 80px 36px',
          gap: 8,
          padding: '6px 10px',
          fontSize: 10,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          fontWeight: 500,
          borderBottom: '1px solid var(--border)',
          marginBottom: 4,
        }}
      >
        <span>Column Name</span>
        <span>Type</span>
        <span>Nullable</span>
        <span>Unique</span>
        <span></span>
      </div>

      {/* Auto-managed id row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 140px 80px 80px 36px',
          gap: 8,
          padding: '8px 10px',
          alignItems: 'center',
          background: 'var(--bg-3)',
          borderRadius: 6,
          marginBottom: 4,
          opacity: 0.7,
        }}
      >
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-1)' }}>
          id
          <Badge variant="green" style={{ marginLeft: 6 }}>PK</Badge>
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--blue)' }}>uuid</span>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>auto</span>
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>—</span>
        <span />
      </div>

      {/* User-defined columns */}
      {columns.map((col) => (
        <div
          key={col.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 80px 80px 36px',
            gap: 8,
            padding: '6px 10px',
            alignItems: 'center',
            borderRadius: 6,
            marginBottom: 4,
            border: '1px solid transparent',
            transition: 'border-color 0.1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
        >
          {/* Name */}
          <Input
            value={col.name}
            onChange={(e) => updateColumn(col.id, 'name', e.target.value)}
            placeholder="column_name"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
          />

          {/* Type */}
          <Select
            value={col.type}
            onChange={(e) => updateColumn(col.id, 'type', e.target.value)}
          >
            {COLUMN_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>

          {/* Nullable toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
            <input
              type="checkbox"
              checked={col.nullable}
              onChange={(e) => updateColumn(col.id, 'nullable', e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
            />
            <span style={{ color: 'var(--text-2)' }}>{col.nullable ? 'yes' : 'no'}</span>
          </label>

          {/* Unique toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
            <input
              type="checkbox"
              checked={col.unique}
              onChange={(e) => updateColumn(col.id, 'unique', e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
            />
            <span style={{ color: 'var(--text-2)' }}>{col.unique ? 'yes' : 'no'}</span>
          </label>

          {/* Delete */}
          <button
            onClick={() => removeColumn(col.id)}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              color: 'var(--text-3)',
              transition: 'color 0.1s, background 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
            title="Delete column"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {/* Auto-managed timestamps */}
      {['created_at', 'updated_at'].map((name) => (
        <div
          key={name}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 80px 80px 36px',
            gap: 8,
            padding: '8px 10px',
            alignItems: 'center',
            opacity: 0.5,
          }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-1)' }}>
            {name}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-2)' }}>timestamp</span>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>auto</span>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>—</span>
          <span />
        </div>
      ))}

      {/* Add column button */}
      <div style={{ marginTop: 12 }}>
        <Button onClick={addColumn} variant="outline" size="sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Column
        </Button>
      </div>

      {columns.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, paddingLeft: 10 }}>
          No columns yet. Click "Add Column" to get started.
        </div>
      )}
    </div>
  );
}

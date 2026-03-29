// frontend/components/AIBuilder/SchemaPreview.jsx
// Displays the AI-generated schema in a structured, readable format.
// Shows tables, columns, types, and relationships before the user confirms.

import { Badge } from '../UI';

const TYPE_COLOR = {
  text:      'blue', string: 'blue',
  integer:   'purple', number: 'purple', bigint: 'purple',
  float:     'purple', decimal: 'purple',
  boolean:   'yellow',
  date:      'green', timestamp: 'green',
  uuid:      'default',
  json:      'red',
};

function TypeBadge({ type }) {
  return (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11,
      color: 'var(--blue)',
      background: 'var(--blue-dim)',
      padding: '1px 6px',
      borderRadius: 3,
    }}>
      {type}
    </span>
  );
}

export default function SchemaPreview({ schema, warnings = [] }) {
  if (!schema || !schema.tables || schema.tables.length === 0) return null;

  return (
    <div>
      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{
          background: 'var(--yellow-dim)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 6, padding: '10px 14px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--yellow)', marginBottom: 4 }}>
            ⚠ {warnings.length} warning{warnings.length > 1 ? 's' : ''}
          </div>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--yellow)', opacity: 0.8 }}>{w}</div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 20, padding: '12px 16px',
        background: 'var(--bg-3)', borderRadius: 8, marginBottom: 16,
        border: '1px solid var(--border)',
      }}>
        {[
          ['Tables', schema.tables.length],
          ['Columns', schema.tables.reduce((sum, t) => sum + (t.columns?.length || 0), 0)],
          ['Relationships', (schema.relationships || []).length],
          ['CRUD APIs', schema.tables.length * 5],
        ].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {schema.tables.map((table) => (
          <div key={table.name} style={{
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 8, overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              padding: '10px 14px', background: 'var(--bg-3)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <rect x="3" y="3" width="18" height="4" rx="1"/>
                <rect x="3" y="10" width="18" height="4" rx="1"/>
                <rect x="3" y="17" width="18" height="4" rx="1"/>
              </svg>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600 }}>
                {table.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {table.columns?.length || 0} columns
              </span>
              {table.description && (
                <span style={{ fontSize: 11, color: 'var(--text-2)', marginLeft: 4 }}>
                  — {table.description}
                </span>
              )}
            </div>

            {/* Auto columns */}
            <div style={{ padding: '4px 14px 0' }}>
              {['id (uuid · PK · auto)', 'created_at (timestamp · auto)', 'updated_at (timestamp · auto)'].map((auto) => (
                <div key={auto} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 0', borderBottom: '1px solid var(--border)',
                  opacity: 0.4,
                }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-2)', flex: 1 }}>
                    {auto}
                  </span>
                </div>
              ))}
            </div>

            {/* User columns */}
            <div style={{ padding: '0 14px 8px' }}>
              {(table.columns || []).map((col) => (
                <div key={col.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, flex: 1 }}>
                    {col.name}
                  </span>
                  <TypeBadge type={col.type} />
                  {col.unique && <Badge variant="yellow">unique</Badge>}
                  {col.nullable === false && (
                    <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}>required</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Relationships */}
      {schema.relationships && schema.relationships.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 500, color: 'var(--text-2)',
            textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8,
          }}>
            Relationships ({schema.relationships.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {schema.relationships.map((rel, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-3)', borderRadius: 5, padding: '7px 12px',
                border: '1px solid var(--border)',
              }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-0)' }}>{rel.fromTable}</span>
                  <span style={{ color: 'var(--text-3)' }}>.</span>
                  <span style={{ color: 'var(--accent-light)' }}>{rel.fromColumn}</span>
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: 12 }}>→</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-0)' }}>{rel.toTable}</span>
                  <span style={{ color: 'var(--text-3)' }}>.</span>
                  <span style={{ color: 'var(--blue)' }}>{rel.toColumn}</span>
                </span>
                <Badge variant="blue">{rel.type}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

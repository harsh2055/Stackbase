// frontend/components/APIInspector/APIInspector.jsx
// Right pane of the Database Builder.
// Shows the auto-generated CRUD API endpoints for the currently selected table,
// plus a copy-to-clipboard button for the API base URL.

import { useState } from 'react';
import { Badge } from '../UI';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const METHOD_COLORS = {
  GET:    { bg: 'var(--accent-dim)',  color: 'var(--accent-light)' },
  POST:   { bg: 'var(--blue-dim)',    color: 'var(--blue)' },
  PUT:    { bg: 'var(--yellow-dim)',  color: 'var(--yellow)' },
  DELETE: { bg: 'var(--red-dim)',     color: 'var(--red)' },
};

const ENDPOINTS = (tableName) => [
  { method: 'GET',    path: `/api/${tableName}`,     description: 'List all records',         params: '?limit=20&offset=0' },
  { method: 'GET',    path: `/api/${tableName}/:id`, description: 'Get record by id',         params: '' },
  { method: 'POST',   path: `/api/${tableName}`,     description: 'Create new record',        params: '' },
  { method: 'PUT',    path: `/api/${tableName}/:id`, description: 'Update record by id',      params: '' },
  { method: 'DELETE', path: `/api/${tableName}/:id`, description: 'Delete record by id',      params: '' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      style={{
        background: copied ? 'var(--accent-dim)' : 'var(--bg-4)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '3px 8px',
        fontSize: 11,
        color: copied ? 'var(--accent-light)' : 'var(--text-2)',
        cursor: 'pointer',
        fontFamily: 'JetBrains Mono, monospace',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  );
}

export default function APIInspector({ tableName, columns = [] }) {
  if (!tableName) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 8,
          color: 'var(--text-3)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M12 3l-2 18" />
        </svg>
        <div style={{ fontSize: 13 }}>Select a table to inspect its generated APIs</div>
      </div>
    );
  }

  const endpoints = ENDPOINTS(tableName);
  const baseUrl = `${BASE_URL}/api/${tableName}`;

  return (
    <div style={{ padding: 16, overflowY: 'auto', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          marginBottom: 14,
        }}
      >
        Generated APIs
      </div>

      {/* Base URL */}
      <div
        style={{
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '8px 10px',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Base URL
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              color: 'var(--accent-light)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {baseUrl}
          </span>
          <CopyButton text={baseUrl} />
        </div>
      </div>

      {/* Endpoints list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {endpoints.map((ep) => {
          const colors = METHOD_COLORS[ep.method];
          return (
            <div
              key={`${ep.method}-${ep.path}`}
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '9px 10px',
                transition: 'border-color 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    background: colors.bg,
                    color: colors.color,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 3,
                    flexShrink: 0,
                    minWidth: 52,
                    textAlign: 'center',
                  }}
                >
                  {ep.method}
                </span>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    color: 'var(--text-0)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ep.path}
                </span>
                <CopyButton text={`${BASE_URL}${ep.path}`} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', paddingLeft: 60 }}>
                {ep.description}
                {ep.params && (
                  <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>{ep.params}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Schema summary */}
      {columns.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-2)',
              textTransform: 'uppercase',
              letterSpacing: '0.7px',
              marginBottom: 10,
            }}
          >
            Schema Preview
          </div>
          <div
            style={{
              background: 'var(--bg-3)',
              borderRadius: 6,
              border: '1px solid var(--border)',
              padding: '10px 12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
              color: 'var(--text-1)',
              lineHeight: 1.8,
            }}
          >
            <span style={{ color: 'var(--purple)' }}>TABLE</span>{' '}
            <span style={{ color: 'var(--accent-light)' }}>{tableName}</span>
            {' {'}
            {columns.map((col) => (
              <div key={col.name || col.id} style={{ paddingLeft: 16 }}>
                <span style={{ color: 'var(--text-0)' }}>{col.name || '...'}</span>
                <span style={{ color: 'var(--text-3)' }}>: </span>
                <span style={{ color: 'var(--blue)' }}>{col.type}</span>
                {col.unique && <span style={{ color: 'var(--yellow)', marginLeft: 6 }}>unique</span>}
                {!col.nullable && <span style={{ color: 'var(--red)', marginLeft: 6 }}>!</span>}
              </div>
            ))}
            {'}'}
          </div>
        </div>
      )}
    </div>
  );
}

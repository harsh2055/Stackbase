// frontend/components/AIBuilder/AIHistoryPanel.jsx
// Shows the history of AI generation requests for a project.
// Each entry shows the prompt, status, tables created, and can be re-viewed.

import { Badge } from '../UI';

const STATUS_BADGE = {
  completed: 'green',
  pending:   'yellow',
  failed:    'red',
};

export default function AIHistoryPanel({ history, onReview }) {
  if (!history || history.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
        No AI generations yet for this project.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {history.map((req) => (
        <div
          key={req.id}
          style={{
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            padding: '12px 14px',
            transition: 'border-color 0.1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Badge variant={STATUS_BADGE[req.status] || 'default'}>{req.status}</Badge>
              {req.tablesCreated > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                  {req.tablesCreated} table{req.tablesCreated > 1 ? 's' : ''} created
                </span>
              )}
              {req.deployed && (
                <Badge variant="blue">deployed</Badge>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {req.generatedSchema && req.status === 'completed' && (
                <button
                  onClick={() => onReview && onReview(req)}
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 4, padding: '3px 8px', fontSize: 11,
                    color: 'var(--accent)', cursor: 'pointer',
                    fontFamily: 'IBM Plex Sans, sans-serif',
                  }}
                >
                  View Schema
                </button>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, marginBottom: req.errorMessage ? 8 : 0 }}>
            {req.prompt.length > 140 ? req.prompt.slice(0, 140) + '...' : req.prompt}
          </div>

          {/* Error */}
          {req.errorMessage && (
            <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>
              Error: {req.errorMessage}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

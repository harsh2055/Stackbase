// frontend/components/Realtime/SubscriptionPanel.jsx
// Panel for subscribing to and unsubscribing from table event streams.
// Shows all project tables and lets the user toggle subscriptions.

import { useState } from 'react';
import { Badge } from '../UI';

export default function SubscriptionPanel({ tables = [], subscribed = new Set(), onSubscribe, onUnsubscribe }) {
  const [custom, setCustom] = useState('');

  const handleCustomSubscribe = () => {
    if (!custom.trim()) return;
    onSubscribe(custom.trim());
    setCustom('');
  };

  return (
    <div>
      {/* Project tables */}
      {tables.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
            Project Tables
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tables.map((table) => {
              const pgName = table.pgTableName || table.tableName;
              const isSubscribed = subscribed.has(pgName);
              return (
                <div
                  key={table.tableName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: isSubscribed ? 'var(--accent-dim)' : 'var(--bg-3)',
                    border: `1px solid ${isSubscribed ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                    borderRadius: 6,
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: isSubscribed ? '#10b981' : 'var(--text-3)',
                    boxShadow: isSubscribed ? '0 0 5px #10b981' : 'none',
                    transition: 'all 0.2s',
                  }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: isSubscribed ? 'var(--accent-light)' : 'var(--text-0)' }}>
                      {table.tableName}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {pgName}
                    </div>
                  </div>

                  <button
                    onClick={() => isSubscribed ? onUnsubscribe(pgName) : onSubscribe(pgName)}
                    style={{
                      background: isSubscribed ? 'rgba(16,185,129,0.15)' : 'var(--bg-4)',
                      border: `1px solid ${isSubscribed ? 'rgba(16,185,129,0.3)' : 'var(--border-hover)'}`,
                      borderRadius: 4,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 500,
                      color: isSubscribed ? 'var(--accent-light)' : 'var(--text-1)',
                      cursor: 'pointer',
                      fontFamily: 'IBM Plex Sans, sans-serif',
                      transition: 'all 0.1s',
                    }}
                  >
                    {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom table name */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
          Custom Table Name
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="prj_abc12345_tablename"
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubscribe()}
            style={{
              flex: 1,
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '7px 10px',
              fontSize: 12, color: 'var(--text-0)', outline: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
          <button
            onClick={handleCustomSubscribe}
            style={{
              background: 'var(--accent)', border: 'none',
              borderRadius: 6, padding: '7px 14px',
              fontSize: 12, fontWeight: 600, color: '#022c22',
              cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
            }}
          >
            Subscribe
          </button>
        </div>
      </div>

      {/* Active subscriptions summary */}
      {subscribed.size > 0 && (
        <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
            Active subscriptions ({subscribed.size})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[...subscribed].map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  background: 'var(--accent-dim)', color: 'var(--accent-light)',
                  padding: '2px 7px', borderRadius: 3,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

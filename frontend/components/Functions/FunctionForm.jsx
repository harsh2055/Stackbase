// frontend/components/Functions/FunctionForm.jsx
// Modal form for creating or editing a serverless function.
// Includes trigger type selector, code editor, and validation.

import { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import { Button, Input, Select, Spinner, ErrorMessage } from '../UI';

const TRIGGER_TYPES = [
  { value: 'onInsert',  label: 'onInsert  — fires after a record is created' },
  { value: 'onUpdate',  label: 'onUpdate  — fires after a record is updated' },
  { value: 'onDelete',  label: 'onDelete  — fires after a record is deleted' },
  { value: 'http',      label: 'http      — triggered by HTTP POST request' },
  { value: 'schedule',  label: 'schedule  — runs on a time interval' },
];

const STARTER_CODE = {
  onInsert: `// Runs after a record is inserted into the table
// event.data contains the new record

console.log('New record created:', event.data.id);

// Example: send a notification
// const userId = event.data.user_id;
// console.log('Sending welcome email to user:', userId);`,

  onUpdate: `// Runs after a record is updated
// event.data contains the updated record

console.log('Record updated:', event.data.id);
console.log('Updated at:', event.data.updated_at);`,

  onDelete: `// Runs after a record is deleted
// event.data contains the deleted record

console.log('Record deleted:', event.data.id);
// Clean up related data here`,

  http: `// Runs when this function's HTTP endpoint is called
// event.method, event.body, event.query are available

const { name, message } = event.body || {};
console.log('HTTP trigger received:', { name, message });

// Return data (shown in response)
console.log(JSON.stringify({ received: true, name }));`,

  schedule: `// Runs on the configured schedule
// event.schedule contains the interval

console.log('Scheduled run at:', event.timestamp);
// Add periodic tasks here:
// - Clean up old records
// - Send digest emails
// - Sync data`,
};

export default function FunctionForm({ fn, tables, onSubmit, onClose, loading }) {
  const isEdit = !!fn;

  const [name,        setName]        = useState(fn?.name        || '');
  const [description, setDescription] = useState(fn?.description || '');
  const [triggerType, setTriggerType] = useState(fn?.triggerType || 'onInsert');
  const [tableName,   setTableName]   = useState(fn?.tableName   || '');
  const [httpPath,    setHttpPath]    = useState(fn?.httpPath    || '/my-function');
  const [schedule,    setSchedule]    = useState(fn?.schedule    || '5m');
  const [code,        setCode]        = useState(fn?.code        || STARTER_CODE.onInsert);
  const [timeout,     setTimeout_]    = useState(fn?.timeout     || 5000);
  const [error,       setError]       = useState('');

  // Update starter code when trigger type changes (only on create)
  useEffect(() => {
    if (!isEdit) {
      setCode(STARTER_CODE[triggerType] || '');
    }
  }, [triggerType, isEdit]);

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Function name is required'); return; }
    if (!code.trim()) { setError('Function code is required'); return; }
    if (['onInsert','onUpdate','onDelete'].includes(triggerType) && !tableName) {
      setError('Table name is required for database triggers'); return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      triggerType,
      tableName:   ['onInsert','onUpdate','onDelete'].includes(triggerType) ? tableName : undefined,
      httpPath:    triggerType === 'http'     ? httpPath    : undefined,
      schedule:    triggerType === 'schedule' ? schedule    : undefined,
      code,
      timeout: parseInt(timeout) || 5000,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
    >
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border-hover)',
        borderRadius: 12, width: '100%', maxWidth: 780,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{isEdit ? 'Edit Function' : 'Create Function'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              {isEdit ? `Editing "${fn.name}"` : 'Write JavaScript that runs on database events, HTTP calls, or schedules'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Row 1: Name + Trigger */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Function Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="sendWelcomeEmail" />
            </div>
            <div>
              <label style={labelStyle}>Trigger Type *</label>
              <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} style={{ width: '100%' }}>
                {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
          </div>

          {/* Trigger-specific options */}
          {['onInsert','onUpdate','onDelete'].includes(triggerType) && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Table Name *</label>
              {tables && tables.length > 0 ? (
                <Select value={tableName} onChange={(e) => setTableName(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Select a table…</option>
                  {tables.map((t) => (
                    <option key={t.tableName} value={t.pgTableName || t.tableName}>
                      {t.tableName} ({t.pgTableName || t.tableName})
                    </option>
                  ))}
                </Select>
              ) : (
                <Input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="prj_abc12345_bookings" />
              )}
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                Use the full pg table name (e.g. prj_abc12345_orders)
              </div>
            </div>
          )}

          {triggerType === 'http' && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>HTTP Path *</label>
              <Input value={httpPath} onChange={(e) => setHttpPath(e.target.value)} placeholder="/send-email" />
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                Endpoint: POST /functions/:projectId{httpPath}
              </div>
            </div>
          )}

          {triggerType === 'schedule' && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Interval *</label>
              <Select value={schedule} onChange={(e) => setSchedule(e.target.value)} style={{ width: '100%' }}>
                <option value="30s">Every 30 seconds</option>
                <option value="1m">Every 1 minute</option>
                <option value="5m">Every 5 minutes</option>
                <option value="15m">Every 15 minutes</option>
                <option value="30m">Every 30 minutes</option>
                <option value="1h">Every hour</option>
                <option value="24h">Every 24 hours</option>
              </Select>
            </div>
          )}

          {/* Description + Timeout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div>
              <label style={labelStyle}>Timeout (ms)</label>
              <Input
                type="number" value={timeout}
                onChange={(e) => setTimeout_(e.target.value)}
                min={500} max={30000} step={500}
              />
            </div>
          </div>

          {/* Code editor */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 8 }}>
              Function Code *
              <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 8, fontWeight: 400 }}>
                JavaScript · async supported · console.log captured
              </span>
            </label>
            <CodeEditor value={code} onChange={setCode} height={240} />
          </div>

          <ErrorMessage message={error} />
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><Spinner size={13} /> Saving…</> : (isEdit ? 'Save Changes' : 'Create Function')}
          </Button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: 'var(--text-1)', marginBottom: 5,
  textTransform: 'uppercase', letterSpacing: '0.5px',
};

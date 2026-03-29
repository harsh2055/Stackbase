// frontend/pages/settings.js
import { useState } from 'react';
import AppLayout from '../components/Layout/AppLayout';
import { Button, Card, Spinner, ErrorMessage, SuccessMessage } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { authApi, setTokenGetter } from '../lib/api';
import withAuth from '../components/Auth/withAuth';

function SettingsPage() {
  const { user, token, login } = useAuth();
  setTokenGetter(() => token);

  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await authApi.updateProfile({ name });
      login(token, result.user);
      setSuccess('Profile updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Settings" subtitle="stackbase / settings">
      <div style={{ maxWidth: 520 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 4 }}>Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Manage your account</p>
        </div>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>
            Profile
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <div style={{
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 12px', fontSize: 13,
              color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace',
            }}>
              {user?.email}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Email cannot be changed</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={{
                width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-0)',
                outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <ErrorMessage message={error} />
          <SuccessMessage message={success} />

          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving} style={{ marginTop: 4 }}>
            {saving ? <Spinner size={12} /> : null}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Card>

        <Card>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
            Account Info
          </div>
          {[
            ['User ID', user?.id],
            ['Role', user?.role],
            ['Phase', 'Phase 3 — Auth & Project System'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-0)' }}>{val}</span>
            </div>
          ))}
        </Card>
      </div>
    </AppLayout>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' };

export default withAuth(SettingsPage);

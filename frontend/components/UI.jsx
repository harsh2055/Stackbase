// frontend/components/UI.jsx
export function Button({ children, onClick, variant = 'default', size = 'md', disabled = false, type = 'button', style = {} }) {
  const sizes = { sm: { padding: '5px 10px', fontSize: 12 }, md: { padding: '7px 14px', fontSize: 13 }, lg: { padding: '10px 20px', fontSize: 14 } };
  const variants = {
    default: { background: 'var(--bg-3)', borderColor: 'var(--border-hover)', color: 'var(--text-0)' },
    primary: { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#022c22', fontWeight: 600 },
    ghost:   { background: 'transparent', borderColor: 'transparent', color: 'var(--text-1)' },
    danger:  { background: 'transparent', borderColor: 'var(--red-dim)', color: 'var(--red)' },
    outline: { background: 'transparent', borderColor: 'var(--border-hover)', color: 'var(--text-0)' },
  };
  return (
    <button type={type} onClick={disabled ? undefined : onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 6, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.1s', fontFamily: 'IBM Plex Sans, sans-serif',
      border: '1px solid', opacity: disabled ? 0.5 : 1, ...sizes[size], ...variants[variant], ...style,
    }}>
      {children}
    </button>
  );
}

export function Badge({ children, variant = 'default' }) {
  const v = {
    default: { background: 'var(--bg-4)', color: 'var(--text-1)' },
    green:   { background: 'var(--accent-dim)', color: 'var(--accent-light)' },
    yellow:  { background: 'var(--yellow-dim)', color: 'var(--yellow)' },
    red:     { background: 'var(--red-dim)', color: 'var(--red)' },
    blue:    { background: 'var(--blue-dim)', color: 'var(--blue)' },
    purple:  { background: 'var(--purple-dim)', color: 'var(--purple)' },
  };
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:500, fontFamily:'JetBrains Mono,monospace', ...v[variant] }}>{children}</span>;
}

export function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="var(--border-hover)" strokeWidth="2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Input({ label, value, onChange, placeholder, type = 'text', style = {}, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }}>{label}</label>}
      <input value={value} onChange={onChange} placeholder={placeholder} type={type}
        style={{ background: 'var(--bg-3)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-0)', outline: 'none', fontFamily: 'IBM Plex Sans, sans-serif', width: '100%', ...style }}
        onFocus={(e) => { e.target.style.borderColor = error ? 'var(--red)' : 'var(--accent)'; }}
        onBlur={(e) => { e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'; }}
        {...props}
      />
      {error && <span style={{ fontSize: 11, color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}

export function Select({ value, onChange, children, style = {} }) {
  return (
    <select value={value} onChange={onChange} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--text-0)', outline: 'none', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', ...style }}>
      {children}
    </select>
  );
}

export function Card({ children, style = {} }) {
  return <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, ...style }}>{children}</div>;
}

export function ErrorMessage({ message }) {
  if (!message) return null;
  return <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginTop: 8 }}>{message}</div>;
}

export function SuccessMessage({ message }) {
  if (!message) return null;
  return <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(110,231,183,0.2)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--accent-light)', marginTop: 8 }}>{message}</div>;
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12, color: 'var(--text-2)', textAlign: 'center' }}>
      {icon && <div style={{ marginBottom: 4, opacity: 0.5 }}>{icon}</div>}
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-1)' }}>{title}</div>
      {description && <div style={{ fontSize: 13, maxWidth: 300 }}>{description}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />;
}

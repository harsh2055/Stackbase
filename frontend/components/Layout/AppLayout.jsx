// frontend/components/Layout/AppLayout.jsx
import Sidebar from './Sidebar';

export default function AppLayout({ title, subtitle, actions, children, activeProject }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeProject={activeProject} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: 52, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
          background: 'var(--bg-1)', flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            {title && <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>}
            {subtitle && (
              <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 12 }}>
                {subtitle}
              </span>
            )}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </header>
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

// frontend/components/Functions/CodeEditor.jsx
// Minimal code editor for writing serverless function JavaScript.
// Uses a textarea with monospace font and line numbers overlay.

import { useRef, useEffect } from 'react';

export default function CodeEditor({ value, onChange, disabled, height = 280 }) {
  const textareaRef = useRef(null);

  // Tab key inserts 2 spaces instead of changing focus
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const newVal = value.slice(0, start) + '  ' + value.slice(end);
      onChange(newVal);
      // Restore cursor after state update
      setTimeout(() => {
        ta.selectionStart = start + 2;
        ta.selectionEnd   = start + 2;
      }, 0);
    }
  };

  return (
    <div style={{
      position: 'relative',
      background: '#0d0d0f',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Editor header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)',
      }}>
        {['#ef4444', '#fbbf24', '#22c55e'].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4, fontFamily: 'JetBrains Mono, monospace' }}>
          function.js
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          display: 'block',
          width: '100%',
          height,
          background: '#0d0d0f',
          color: '#e2e8f0',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          lineHeight: 1.7,
          padding: '14px 16px',
          border: 'none',
          outline: 'none',
          resize: 'vertical',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );
}

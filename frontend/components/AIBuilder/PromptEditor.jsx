// frontend/components/AIBuilder/PromptEditor.jsx
// The prompt input area for the AI Backend Generator.
// Includes sample prompts, character counter, and a typing-animation placeholder.

import { useState } from 'react';

const SAMPLES = [
  'Build a car rental platform where users register, browse available cars by category, and make bookings. Admins manage the fleet and pricing.',
  'Create an e-commerce backend with products, categories, orders, customers, reviews, and inventory tracking.',
  'Build a SaaS project management tool with workspaces, projects, tasks, assignees, comments, and file attachments.',
  'Create a food delivery app with restaurants, menus, orders, delivery drivers, and customer ratings.',
  'Build a marketplace for freelancers where clients post jobs, freelancers submit proposals, and payments are tracked per milestone.',
];

export default function PromptEditor({ value, onChange, disabled }) {
  const [activeSample, setActiveSample] = useState(null);
  const maxLength = 2000;
  const remaining = maxLength - value.length;
  const isNearLimit = remaining < 200;

  const applySample = (sample) => {
    onChange(sample);
    setActiveSample(sample);
  };

  return (
    <div>
      {/* Sample prompts */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
          Sample prompts — click to use
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {SAMPLES.map((sample, i) => {
            const isActive = value === sample;
            return (
              <button
                key={i}
                onClick={() => applySample(sample)}
                disabled={disabled}
                style={{
                  background: isActive ? 'var(--accent-dim)' : 'var(--bg-3)',
                  border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                  borderRadius: 6,
                  padding: '8px 12px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  color: isActive ? 'var(--accent-light)' : 'var(--text-2)',
                  fontSize: 12,
                  lineHeight: 1.5,
                  transition: 'all 0.15s',
                  opacity: disabled ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!isActive && !disabled) { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-0)'; }}}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}}
              >
                {sample.length > 100 ? sample.slice(0, 100) + '...' : sample}
              </button>
            );
          })}
        </div>
      </div>

      {/* Textarea */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Describe your application in detail...

Example:
Build a car rental platform where users can register, browse cars by category and availability, make bookings, and process payments. Admins should be able to manage the car fleet, set pricing, and view booking reports."
          maxLength={maxLength}
          style={{
            width: '100%',
            height: 180,
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 13,
            color: 'var(--text-0)',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'IBM Plex Sans, sans-serif',
            lineHeight: 1.6,
            transition: 'border-color 0.15s',
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
          onFocus={(e) => { if (!disabled) e.target.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
        />
        <div style={{
          position: 'absolute', bottom: 8, right: 12,
          fontSize: 11, color: isNearLimit ? 'var(--yellow)' : 'var(--text-3)',
          fontFamily: 'JetBrains Mono, monospace',
          transition: 'color 0.2s',
        }}>
          {remaining}
        </div>
      </div>

      {/* Tips */}
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-2)' }}>Tips for better results:</strong>{' '}
        Name your entities clearly · Describe relationships between them · Mention key features like auth, payments, or search · More detail = better schema
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { SummaryStyle } from '../../types';

interface Props {
  value: SummaryStyle;
  onChange: (s: SummaryStyle) => void;
  disabled?: boolean;
}

const OPTIONS: { id: SummaryStyle; label: string; meta: string }[] = [
  { id: 'tldr',     label: 'TL;DR',        meta: '· single line · <30w' },
  { id: 'bullets',  label: 'Bullet points', meta: '· concise · ~120w' },
  { id: 'detailed', label: 'Detailed',      meta: '· multi-paragraph' },
];

export default function StyleDropdown({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 6px' }}>
        <span style={{ fontFamily: 'var(--qi-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--qi-muted)', fontWeight: 500 }}>Style</span>
        <span style={{ fontFamily: 'var(--qi-mono)', fontSize: 10.5, color: 'var(--qi-muted2)' }}>↓ {current.label}</span>
      </div>

      <div className="qi-dd-wrap" ref={ref}>
        <button
          type="button"
          className={`qi-dd-trigger${open ? ' open' : ''}${disabled ? ' disabled' : ''}`}
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span>{current.label}</span>
            <span className="qi-dd-meta">{current.meta}</span>
          </span>
          <svg className="qi-dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div className="qi-dd-list">
            {OPTIONS.map((o) => {
              const sel = o.id === value;
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`qi-dd-item${sel ? ' selected' : ''}`}
                  onClick={() => { onChange(o.id); setOpen(false); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{o.label}</span>
                    <span className="qi-dd-meta">{o.meta}</span>
                  </span>
                  {sel && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, color: 'var(--qi-brand)', flexShrink: 0 }} aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

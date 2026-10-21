import { useState } from 'react';
import type { SummaryRecord } from '../../types';
import { copyToClipboard } from '../../utils/clipboard';

interface Props {
  record: SummaryRecord;
}

const STYLE_LABELS: Record<SummaryRecord['style'], string> = {
  tldr: 'TL;DR',
  bullets: 'Bullets',
  detailed: 'Detailed',
};

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago · `;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago · `;
  return new Date(ts).toLocaleDateString() + ' · ';
}

export default function SummaryCard({ record }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(record.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* swallow */ }
  };

  const handleOpen = () => chrome.tabs.create({ url: record.url });

  // Derive domain from URL
  let domain = '';
  try { domain = new URL(record.url).hostname.replace('www.', ''); } catch { domain = ''; }

  // Favicon letter + color
  const letter = (domain[0] || record.title[0] || '?').toUpperCase();

  return (
    <article className="qi-result">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderBottom: '1px solid var(--qi-border)',
      }}>
        <span className="qi-pill">
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--qi-brand)', boxShadow: '0 0 6px var(--qi-brand)', display: 'inline-block' }} />
          {STYLE_LABELS[record.style]}
        </span>
        <span style={{ fontFamily: 'var(--qi-mono)', fontSize: 10, color: 'var(--qi-muted)', letterSpacing: '0.02em' }}>
          {formatRelative(record.createdAt)}{domain}
        </span>
      </div>

      {/* Page title row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px 0',
      }}>
        <div style={{
          width: 18, height: 18,
          borderRadius: 5,
          background: 'linear-gradient(135deg, #1c5fae, #0f3a73)',
          display: 'grid', placeItems: 'center',
          font: '700 9px var(--qi-mono)',
          color: '#b6d6ff',
          flexShrink: 0,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
        }}>{letter}</div>
        <div style={{
          fontSize: 11.5,
          color: 'var(--qi-text)',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>{record.title}</div>
      </div>

      {/* Content */}
      <div style={{
        padding: '10px 12px',
        fontSize: 12.5,
        lineHeight: 1.55,
        color: '#d6e0f0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {record.content}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 10px',
        borderTop: '1px solid var(--qi-border)',
        background: 'rgba(6,11,24,0.4)',
      }}>
        <button className="qi-ghost" onClick={handleCopy}>
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Copied
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              Copy
            </>
          )}
        </button>
        <button className="qi-ghost" onClick={handleOpen}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          Open
        </button>
      </div>
    </article>
  );
}

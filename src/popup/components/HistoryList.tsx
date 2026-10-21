import { useState } from 'react';
import type { SummaryRecord } from '../../types';

interface Props {
  items: SummaryRecord[];
  onSelect: (record: SummaryRecord) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const STYLE_LABELS: Record<SummaryRecord['style'], string> = {
  tldr: 'TL;DR',
  bullets: 'Bullets',
  detailed: 'Detailed',
};

// Deterministic color from string
const FAVE_COLORS = [
  'linear-gradient(135deg,#d97757,#c45a39)',
  'linear-gradient(135deg,#000,#333)',
  'linear-gradient(135deg,#ff5722,#c4451c)',
  'linear-gradient(135deg,#1da1f2,#0d6db8)',
  'linear-gradient(135deg,#2da44e,#1a7f37)',
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#1c5fae,#0f3a73)',
  'linear-gradient(135deg,#8b5cf6,#7c3aed)',
];
function favColor(s: string): string {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return FAVE_COLORS[n % FAVE_COLORS.length];
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(ts).toLocaleDateString();
}

function groupByDay(items: SummaryRecord[]): { label: string; items: SummaryRecord[] }[] {
  const groups: Map<string, SummaryRecord[]> = new Map();
  const now = new Date();
  for (const item of items) {
    const d = new Date(item.createdAt);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    let label: string;
    if (diffDays === 0) label = 'Today · ' + d.toLocaleDateString('en', { weekday: 'short', day: '2-digit' });
    else if (diffDays === 1) label = 'Yesterday · ' + d.toLocaleDateString('en', { weekday: 'short', day: '2-digit' });
    else label = d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: '2-digit' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

export default function HistoryList({ items, onSelect, onDelete, onClearAll }: Props) {
  const [query, setQuery] = useState('');

  const filtered = query
    ? items.filter(i => i.title.toLowerCase().includes(query.toLowerCase()) || i.url.toLowerCase().includes(query.toLowerCase()))
    : items;

  const groups = groupByDay(filtered);

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--qi-s2)', border: '1px solid var(--qi-border)', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18, color: 'var(--qi-muted)' }} aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--qi-text)', margin: 0 }}>No summaries yet</p>
        <p style={{ fontSize: 11, color: 'var(--qi-muted)', marginTop: 4 }}>Your past summaries will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div style={{
        height: 36, borderRadius: 10,
        background: 'var(--qi-s1)',
        border: '1px solid var(--qi-border)',
        display: 'flex', alignItems: 'center',
        padding: '0 10px', gap: 8, marginBottom: 12,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, color: 'var(--qi-muted)', flexShrink: 0 }} aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search summaries…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--qi-text)',
            font: '500 12px -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--qi-muted)', fontSize: 14, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Clear all */}
      {filtered.length > 0 && !query && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button
            onClick={onClearAll}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#ff8b8b', fontWeight: 600 }}
          >Clear all</button>
        </div>
      )}

      {/* Groups */}
      {groups.map(group => (
        <div key={group.label}>
          <div className="qi-hist-day">{group.label}</div>
          {group.items.map(item => {
            let domain = '';
            try { domain = new URL(item.url).hostname.replace('www.', ''); } catch { /* ignore */ }
            const letter = (domain[0] || item.title[0] || '?').toUpperCase();
            return (
              <HistoryItem
                key={item.id}
                item={item}
                letter={letter}
                domain={domain}
                color={favColor(domain || item.id)}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      ))}

      {filtered.length === 0 && query && (
        <p style={{ fontSize: 12, color: 'var(--qi-muted)', textAlign: 'center', marginTop: 24 }}>No results for "{query}"</p>
      )}
    </div>
  );
}

function HistoryItem({ item, letter, domain, color, onSelect, onDelete }: {
  item: SummaryRecord; letter: string; domain: string; color: string;
  onSelect: (r: SummaryRecord) => void; onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', gap: 10, padding: 10,
        borderRadius: 10,
        border: `1px solid ${hovered ? 'var(--qi-border)' : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all .15s ease',
        alignItems: 'flex-start',
        position: 'relative',
        background: hovered ? 'var(--qi-s2)' : 'transparent',
      }}
    >
      {/* Favicon */}
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: color,
        flexShrink: 0, display: 'grid', placeItems: 'center',
        font: '700 10px var(--qi-mono)', color: '#fff',
        marginTop: 1,
      }}>{letter}</div>

      {/* Content */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--qi-text)',
          lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          paddingRight: hovered ? 28 : 0,
        }}>{item.title}</div>
        <div style={{
          fontSize: 11, color: 'var(--qi-muted)', lineHeight: 1.4, marginTop: 2,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
        }}>{item.content.slice(0, 120)}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
          fontFamily: 'var(--qi-mono)', fontSize: 9.5,
          color: 'var(--qi-muted2)', textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <span style={{
            height: 16, padding: '0 6px', borderRadius: 999,
            background: 'rgba(91,94,244,0.12)', border: '1px solid rgba(91,94,244,0.28)',
            color: '#b3b6ff', fontSize: 9.5, letterSpacing: '0.05em',
            display: 'inline-flex', alignItems: 'center', textTransform: 'none',
          }}>{STYLE_LABELS[item.style]}</span>
          <span>·</span>
          <span>{formatRelative(item.createdAt)}</span>
          {domain && <><span>·</span><span>{domain}</span></>}
        </div>
      </div>

      {/* Trash — appears on hover */}
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(item.id); }}
          aria-label="Delete"
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 24, height: 24, borderRadius: 7,
            background: 'var(--qi-s1)',
            border: '1px solid var(--qi-border)',
            color: 'var(--qi-muted)',
            display: 'grid', placeItems: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ff8b8b'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--qi-muted)'; e.currentTarget.style.borderColor = 'var(--qi-border)'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }} aria-hidden="true">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      )}
    </div>
  );
}

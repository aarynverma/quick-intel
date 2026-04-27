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

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function HistoryList({ items, onSelect, onDelete, onClearAll }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">No summaries yet</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your past summaries will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {items.length} {items.length === 1 ? 'summary' : 'summaries'}
        </span>
        <button
          onClick={onClearAll}
          className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
        >
          Clear all
        </button>
      </div>

      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className="group block w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-brand-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-500"
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 flex-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {item.title}
            </h3>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              role="button"
              tabIndex={0}
              className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
              aria-label="Delete"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443H3.5a.75.75 0 0 0 0 1.5h.334l.623 10.596A2.75 2.75 0 0 0 7.2 19h5.6a2.75 2.75 0 0 0 2.743-2.71l.623-10.597h.334a.75.75 0 0 0 0-1.5H14v-.443A2.75 2.75 0 0 0 11.25 1h-2.5Zm3.75 3.193V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.443h5Z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <p className="mb-1.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">{item.url}</p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              {STYLE_LABELS[item.style]}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatRelative(item.createdAt)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

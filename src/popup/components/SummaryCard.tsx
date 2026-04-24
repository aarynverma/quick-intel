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

export default function SummaryCard({ record }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(record.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Swallow — UI stays in its previous state; user can retry.
    }
  };

  const handleOpen = () => chrome.tabs.create({ url: record.url });

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="inline-flex items-center rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
          {STYLE_LABELS[record.style]}
        </span>
        <time className="text-[11px] text-slate-500">
          {new Date(record.createdAt).toLocaleString()}
        </time>
      </div>

      <div className="p-3">
        <h2 className="mb-2 line-clamp-2 text-sm font-semibold text-slate-900">{record.title}</h2>
        <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
          {record.content}
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-100 bg-slate-50/50 px-3 py-2">
        <button
          onClick={handleCopy}
          className={`flex-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
            copied
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          {copied ? (
            <span className="inline-flex items-center gap-1">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
              </svg>
              Copied!
            </span>
          ) : (
            'Copy'
          )}
        </button>
        <button
          onClick={handleOpen}
          className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Open page
        </button>
      </div>
    </article>
  );
}

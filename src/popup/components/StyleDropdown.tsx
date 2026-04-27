import type { SummaryStyle } from '../../types';

interface Props {
  value: SummaryStyle;
  onChange: (s: SummaryStyle) => void;
  disabled?: boolean;
}

const OPTIONS: { id: SummaryStyle; label: string; description: string }[] = [
  { id: 'tldr', label: 'TL;DR', description: 'Quick 2–3 sentence summary' },
  { id: 'bullets', label: 'Bullet points', description: '5–8 key takeaways' },
  { id: 'detailed', label: 'Detailed', description: 'Multi-paragraph breakdown' },
];

export default function StyleDropdown({ value, onChange, disabled }: Props) {
  const current = OPTIONS.find((o) => o.id === value)!;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Summary style</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SummaryStyle)}
          disabled={disabled}
          className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-900 shadow-sm transition hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:disabled:bg-slate-900"
        >
          {OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{current.description}</p>
    </div>
  );
}

interface Props {
  active: 'summarize' | 'history' | 'settings';
  onChange: (tab: 'summarize' | 'history' | 'settings') => void;
  historyCount: number;
  needsSetup: boolean;
}

export default function TabBar({ active, onChange, historyCount, needsSetup }: Props) {
  const tabs = [
    { id: 'summarize' as const, label: 'Summarize' },
    { id: 'history' as const, label: `History${historyCount ? ` (${historyCount})` : ''}` },
    { id: 'settings' as const, label: 'Settings', badge: needsSetup },
  ];

  return (
    <nav className="flex border-b border-slate-100 dark:border-slate-700">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative flex-1 border-b-2 px-3 py-2.5 text-xs font-medium transition ${
            active === t.id
              ? 'border-brand-600 text-brand-700 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          {t.label}
          {t.badge && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
          )}
        </button>
      ))}
    </nav>
  );
}

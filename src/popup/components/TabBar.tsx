interface Props {
  active: 'summarize' | 'history' | 'settings';
  onChange: (tab: 'summarize' | 'history' | 'settings') => void;
  historyCount: number;
  needsSetup: boolean;
}

export default function TabBar({ active, onChange, historyCount, needsSetup }: Props) {
  const tabs = [
    { id: 'summarize' as const, label: 'Summarize', count: null },
    { id: 'history' as const, label: 'History', count: historyCount || null },
    { id: 'settings' as const, label: 'Settings', count: null, badge: needsSetup },
  ];

  return (
    <nav style={{
      display: 'flex',
      padding: '0 14px',
      borderBottom: '1px solid var(--qi-border)',
      flexShrink: 0,
    }}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={isActive ? 'qi-tab-active' : ''}
            style={{
              appearance: 'none',
              background: 'none',
              border: 'none',
              color: isActive ? 'var(--qi-text)' : 'var(--qi-muted)',
              font: '600 12px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              letterSpacing: '-0.005em',
              padding: '12px 4px 11px',
              marginRight: 18,
              cursor: 'pointer',
              position: 'relative',
              transition: 'color .15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
            {t.count !== null && (
              <span style={{
                marginLeft: 4,
                fontFamily: 'var(--qi-mono)',
                fontSize: 10,
                color: 'var(--qi-muted2)',
                fontWeight: 500,
              }}>{t.count}</span>
            )}
            {t.badge && (
              <span style={{
                position: 'absolute',
                top: 8, right: -2,
                width: 5, height: 5,
                borderRadius: '50%',
                background: '#f59e0b',
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

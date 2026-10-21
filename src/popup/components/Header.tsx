interface Props {
  onSettingsClick?: () => void;
}

export default function Header({ onSettingsClick }: Props) {
  return (
    <header style={{
      height: 52,
      padding: '0 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--qi-border)',
      background: 'linear-gradient(180deg, rgba(13,22,40,0.6), rgba(13,22,40,0))',
      backdropFilter: 'blur(6px)',
      flexShrink: 0,
    }}>
      {/* Brand lockup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28,
          borderRadius: 8,
          background: 'var(--qi-grad)',
          display: 'grid', placeItems: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 14px -2px rgba(91,94,244,0.55)',
          flexShrink: 0,
        }}>
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14, color: '#fff', filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.3))' }} aria-hidden="true">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--qi-text)' }}>
          Quick Intel
        </span>
        <span style={{
          fontFamily: 'var(--qi-mono)',
          fontSize: 9.5,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 999,
          color: '#c9caff',
          background: 'rgba(91,94,244,0.15)',
          border: '1px solid rgba(91,94,244,0.35)',
          letterSpacing: '0.05em',
          marginLeft: 2,
        }}>v2</span>
      </div>

      {/* Settings icon */}
      <button
        onClick={onSettingsClick}
        aria-label="Settings"
        style={{
          width: 28, height: 28,
          borderRadius: 8,
          display: 'grid', placeItems: 'center',
          color: 'var(--qi-muted)',
          background: 'transparent',
          border: '1px solid transparent',
          cursor: 'pointer',
          transition: 'all .15s ease',
        }}
        onMouseEnter={e => {
          const b = e.currentTarget;
          b.style.color = 'var(--qi-text)';
          b.style.background = 'rgba(255,255,255,0.04)';
          b.style.borderColor = 'var(--qi-border)';
        }}
        onMouseLeave={e => {
          const b = e.currentTarget;
          b.style.color = 'var(--qi-muted)';
          b.style.background = 'transparent';
          b.style.borderColor = 'transparent';
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }} aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>
  );
}

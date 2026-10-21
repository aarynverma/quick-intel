interface Props {
  onGetStarted: () => void;
}

const PROVIDERS = [
  {
    href: 'https://aistudio.google.com/apikey',
    name: 'Google Gemini',
    badge: 'Free tier',
    meta: 'gemini-2.0-flash · free & fast · no credit card',
    accent: '#10b981',
    accentBg: 'rgba(16,185,129,.1)',
    accentBorder: 'rgba(16,185,129,.3)',
  },
  {
    href: 'https://platform.openai.com/api-keys',
    name: 'OpenAI',
    badge: null,
    meta: 'gpt-4o-mini · fast & cheap',
    accent: 'var(--qi-brand)',
    accentBg: 'rgba(91,94,244,.08)',
    accentBorder: 'rgba(91,94,244,.25)',
  },
  {
    href: 'https://console.anthropic.com/settings/keys',
    name: 'Anthropic',
    badge: null,
    meta: 'Claude Haiku · high quality',
    accent: 'var(--qi-brand)',
    accentBg: 'rgba(91,94,244,.08)',
    accentBorder: 'rgba(91,94,244,.25)',
  },
];

export default function Welcome({ onGetStarted }: Props) {
  return (
    <div>
      {/* Hero card */}
      <div style={{
        borderRadius: 14,
        border: '1px solid rgba(91,94,244,.3)',
        background: 'linear-gradient(135deg, rgba(91,94,244,.12), rgba(139,92,246,.08))',
        padding: '16px 14px',
        marginBottom: 16,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--qi-text)', marginBottom: 6 }}>
          Welcome to Quick Intel
        </div>
        <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--qi-muted)', margin: 0 }}>
          Summarize any article in seconds. You'll need your own API key to get started.
        </p>
      </div>

      {/* Provider links */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: 'var(--qi-mono)', fontSize: 10, letterSpacing: '.14em',
          textTransform: 'uppercase', color: 'var(--qi-muted2)', marginBottom: 8,
        }}>Get a key (takes 2 minutes)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PROVIDERS.map(p => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${p.accentBorder}`,
                background: p.accentBg,
                textDecoration: 'none',
                transition: 'border-color .15s ease, box-shadow .15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px -4px rgba(0,0,0,.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--qi-text)' }}>{p.name}</span>
                  {p.badge && (
                    <span style={{
                      height: 16, padding: '0 6px', borderRadius: 999,
                      background: 'rgba(16,185,129,.2)', border: '1px solid rgba(16,185,129,.4)',
                      color: '#34d399', fontSize: 9.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center',
                    }}>{p.badge}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--qi-muted)' }}>{p.meta}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: p.accent, flexShrink: 0, marginLeft: 8 }}>Get key →</span>
            </a>
          ))}
        </div>
      </div>

      <button className="qi-cta qi-cta-pulse" onClick={onGetStarted}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }} aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3"/>
        </svg>
        I have a key, let's go
      </button>

    </div>
  );
}

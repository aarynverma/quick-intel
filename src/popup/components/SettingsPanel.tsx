import { useEffect, useRef, useState } from 'react';
import type { Provider, PublicSettings, Settings, Theme } from '../../types';

interface Props {
  publicSettings: PublicSettings;
  onSave: (settings: Settings) => void;
  onResumeEnhancer: () => void;
}

const MODEL_OPTIONS: Record<Provider, { value: string; label: string; meta: string }[]> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini', meta: '· fast & cheap' },
    { value: 'gpt-4o',      label: 'GPT-4o',      meta: '· best quality' },
    { value: 'gpt-4.1-mini',label: 'GPT-4.1 mini', meta: '· latest' },
  ],
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', meta: '· fast' },
    { value: 'claude-sonnet-4-5',         label: 'Claude Sonnet 4.5', meta: '· 200k ctx' },
  ],
  gemini: [
    { value: 'gemini-flash-latest', label: 'Gemini Flash', meta: '· free tier' },
    { value: 'gemini-2.0-flash',    label: 'Gemini 2.0 Flash', meta: '' },
    { value: 'gemini-2.5-flash',    label: 'Gemini 2.5 Flash', meta: '' },
  ],
};

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'openai',    label: 'GPT-4o' },
  { id: 'anthropic', label: 'Claude' },
  { id: 'gemini',    label: 'Gemini' },
];

const THEMES: { id: Theme; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light',  label: 'Light' },
  { id: 'dark',   label: 'Dark' },
];

function getInitialModel(provider: Provider, savedModel: string): string {
  const opts = MODEL_OPTIONS[provider];
  return opts.some((o) => o.value === savedModel) ? savedModel : opts[0].value;
}

type KeyMode = 'viewing' | 'editing';

const CHECKMARK = (
  <svg className="qi-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Custom Model Dropdown ─────────────────────────────────────────────────────

function ModelDropdown({ provider, value, onChange }: {
  provider: Provider; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = MODEL_OPTIONS[provider];
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  return (
    <div className="qi-dd-wrap" ref={ref}>
      <button type="button" className={`qi-dd-trigger${open ? ' open' : ''}`} onClick={() => setOpen((v) => !v)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span>{current.label}</span>
          {current.meta && <span className="qi-dd-meta">{current.meta}</span>}
        </span>
        <svg className="qi-dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="qi-dd-list">
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <button key={o.value} type="button" className={`qi-dd-item${sel ? ' selected' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{o.label}</span>
                  {o.meta && <span className="qi-dd-meta">{o.meta}</span>}
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
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────

export default function SettingsPanel({ publicSettings, onSave, onResumeEnhancer }: Props) {
  const [provider, setProvider] = useState<Provider>(publicSettings.provider);
  const [model, setModel] = useState(getInitialModel(publicSettings.provider, publicSettings.model));
  const [theme, setTheme] = useState<Theme>(publicSettings.theme ?? 'system');
  const [saving, setSaving] = useState(false);
  const [enhancerEnabled, setEnhancerEnabled] = useState(publicSettings.enhancer.enabled);
  const [disabledDomains, setDisabledDomains] = useState<string[]>(publicSettings.enhancer.disabledDomains);

  const [keyModes, setKeyModes] = useState<Record<Provider, KeyMode>>(() => ({
    openai:    publicSettings.hasApiKey.openai    ? 'viewing' : 'editing',
    anthropic: publicSettings.hasApiKey.anthropic ? 'viewing' : 'editing',
    gemini:    publicSettings.hasApiKey.gemini    ? 'viewing' : 'editing',
  }));
  const [draftKeys, setDraftKeys] = useState<Record<Provider, string>>({ openai: '', anthropic: '', gemini: '' });
  const [showKey, setShowKey] = useState(false);

  // Track initial values to detect dirty state
  const initialRef = useRef({
    provider: publicSettings.provider,
    model:    getInitialModel(publicSettings.provider, publicSettings.model),
    theme:    publicSettings.theme ?? 'system' as Theme,
    enhancerEnabled: publicSettings.enhancer.enabled,
    disabledDomains: [...publicSettings.enhancer.disabledDomains],
  });

  const hasAnyKey = Object.values(publicSettings.hasApiKey).some(Boolean);
  const hasDraftKey = Object.values(draftKeys).some((k) => k.trim() !== '');
  const init = initialRef.current;

  const isDirty =
    provider !== init.provider ||
    model !== init.model ||
    (theme as string) !== (init.theme as string) ||
    enhancerEnabled !== init.enhancerEnabled ||
    disabledDomains.join('\n') !== init.disabledDomains.join('\n') ||
    hasDraftKey;

  const isSaveEnabled = isDirty || !hasAnyKey;

  const keyMode = keyModes[provider];
  const hasKey  = publicSettings.hasApiKey[provider];
  const preview = publicSettings.apiKeyPreviews[provider];

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setModel(MODEL_OPTIONS[p][0].value);
    setShowKey(false);
  };

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const dark = t === 'dark' || (t === 'system' && mq.matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
  };

  const handleKeyFocus = () => {
    if (keyMode === 'viewing') {
      setKeyModes(m => ({ ...m, [provider]: 'editing' }));
      setDraftKeys(d => ({ ...d, [provider]: '' }));
      setShowKey(false);
    }
  };
  const handleKeyBlur = () => {
    if (keyMode === 'editing' && draftKeys[provider] === '' && hasKey) {
      setKeyModes(m => ({ ...m, [provider]: 'viewing' }));
    }
  };
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (keyMode === 'editing') setDraftKeys(d => ({ ...d, [provider]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    onSave({
      apiKeys: {
        openai:    draftKeys.openai.trim(),
        anthropic: draftKeys.anthropic.trim(),
        gemini:    draftKeys.gemini.trim(),
      },
      model, provider, theme,
      enhancer: { enabled: enhancerEnabled, disabledDomains },
    });
    setSaving(false);
  };

  const displayValue = keyMode === 'viewing'
    ? (showKey ? `••••••••••${preview}` : '••••••••••••••')
    : draftKeys[provider];

  const sec: React.CSSProperties = { marginBottom: 18 };

  return (
    <div>
      {/* ── Provider ── */}
      <div style={sec}>
        <div className="qi-sec-h">Provider</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {PROVIDERS.map(p => (
            <button key={p.id} className={`qi-prov${provider === p.id ? ' active' : ''}`} onClick={() => handleProviderChange(p.id)}>
              {provider === p.id && CHECKMARK}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Model ── */}
      <div style={sec}>
        <div className="qi-sec-h">Model</div>
        <ModelDropdown
          provider={provider}
          value={model}
          onChange={(v) => setModel(v)}
        />
      </div>

      {/* ── Theme ── */}
      <div style={sec}>
        <div className="qi-sec-h">Theme</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {THEMES.map(t => (
            <button key={t.id} className={`qi-prov${theme === t.id ? ' active' : ''}`} onClick={() => handleThemeChange(t.id)}>
              {theme === t.id && CHECKMARK}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── API Key ── */}
      <div style={sec}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="qi-sec-h" style={{ margin: 0, flex: 1 }}>
            API Key
            <span style={{ fontFamily: 'var(--qi-mono)', fontSize: 9, color: 'var(--qi-muted2)', textTransform: 'none', letterSpacing: '0.04em', marginLeft: 4 }}>
              ({PROVIDERS.find(p => p.id === provider)?.label})
            </span>
          </div>
          {hasKey && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: '600 10.5px -apple-system, BlinkMacSystemFont, system-ui, sans-serif', color: 'var(--qi-green)' }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.55)', display: 'grid', placeItems: 'center', color: 'var(--qi-green)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 8, height: 8 }} aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              Saved
            </span>
          )}
        </div>
        <div className={`qi-keyfield${keyMode === 'editing' ? ' editing' : ''}`}>
          <input
            type={keyMode === 'viewing' ? 'text' : showKey ? 'text' : 'password'}
            value={displayValue}
            className={keyMode === 'viewing' ? 'masked' : ''}
            readOnly={keyMode === 'viewing'}
            onFocus={handleKeyFocus}
            onBlur={handleKeyBlur}
            onChange={handleKeyChange}
            placeholder={keyMode === 'editing' && !hasKey ? (provider === 'gemini' ? 'AIza...' : 'sk-...') : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="qi-keyfield-btn"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setShowKey(v => !v)}
          >{showKey ? 'Hide' : 'Show'}</button>
        </div>
        <div style={{ fontFamily: 'var(--qi-mono)', fontSize: 10.5, color: 'var(--qi-muted2)', marginTop: 6 }}>
          {keyMode === 'viewing'
            ? 'stored locally · never sent to our servers'
            : hasKey ? 'click away to cancel and keep your saved key' : ''}
        </div>
      </div>

      {/* ── Prompt Enhancer ── */}
      <div style={sec}>
        <div className="qi-sec-h">Prompt Enhancer</div>
        <div style={{ borderTop: '1px solid var(--qi-border)', paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--qi-border)' }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--qi-text)' }}>Enable enhancer</div>
              <div style={{ fontSize: 11, color: 'var(--qi-muted)', marginTop: 2, maxWidth: 220, lineHeight: 1.4 }}>
                Hotkey: <span style={{ fontFamily: 'var(--qi-mono)', fontSize: 10 }}>Ctrl+Shift+Q</span> in any text field
              </div>
            </div>
            <div className="qi-toggle-seg">
              <button className={enhancerEnabled ? 'active' : ''} onClick={() => setEnhancerEnabled(true)}>On</button>
              <button className={!enhancerEnabled ? 'active' : ''} onClick={() => setEnhancerEnabled(false)}>Off</button>
            </div>
          </div>

          {/* Pause status — shown only when enhancer is paused */}
          {publicSettings.enhancerPausedUntil && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '9px 10px', marginTop: 6, borderRadius: 9,
              background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.22)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, color: '#f59e0b', flexShrink: 0 }} aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#fbbf24' }}>Enhancer paused</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(251,191,36,.7)', marginTop: 1 }}>
                    {Math.max(1, Math.ceil((publicSettings.enhancerPausedUntil - Date.now()) / 60_000))}m remaining
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onResumeEnhancer}
                style={{
                  height: 28, padding: '0 10px', borderRadius: 7, flexShrink: 0,
                  background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.35)',
                  color: '#fbbf24', fontSize: 11.5, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all .15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,.15)'; }}
              >Resume now</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Disabled on ── */}
      {disabledDomains.length > 0 && (
        <div style={sec}>
          <div className="qi-sec-h">Disabled on</div>
          <div className="qi-sites-box">
            {disabledDomains.map(domain => (
              <span key={domain} className="qi-tag-pill">
                {domain}
                <span className="qi-tag-x" onClick={() => setDisabledDomains(d => d.filter(x => x !== domain))}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Save ── */}
      <button
        className="qi-cta"
        style={isSaveEnabled ? {} : {
          background: 'rgba(91,94,244,0.06)',
          boxShadow: 'none',
          color: 'var(--qi-muted)',
          opacity: 0.6,
          cursor: 'not-allowed',
        }}
        onClick={isSaveEnabled ? handleSave : undefined}
        disabled={saving || !isSaveEnabled}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }} aria-hidden="true">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        {saving ? 'Saving…' : 'Save settings'}
      </button>

      {/* ── Privacy ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 10.5, color: 'var(--qi-muted)', lineHeight: 1.5, padding: '10px 0 0' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13, color: 'var(--qi-green)', flexShrink: 0, marginTop: 1 }} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Your keys and summaries live only in this browser. We don't collect telemetry or read page contents on our servers.</span>
      </div>

      {/* ── Footer ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--qi-border)', fontFamily: 'var(--qi-mono)', fontSize: 10, color: 'var(--qi-muted2)' }}>
        <span>v2.0.0</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { Provider, PublicSettings, Settings, Theme } from '../../types';

interface Props {
  publicSettings: PublicSettings;
  onSave: (settings: Settings) => void;
}

const MODEL_OPTIONS: Record<Provider, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini (fast & cheap)' },
    { value: 'gpt-4o', label: 'GPT-4o (best quality)' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  ],
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast)' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (balanced)' },
  ],
  gemini: [
    { value: 'gemini-flash-latest', label: 'Gemini Flash (free tier)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
};

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
};

const THEME_OPTIONS: { id: Theme; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function getInitialModel(provider: Provider, savedModel: string): string {
  const opts = MODEL_OPTIONS[provider];
  return opts.some((o) => o.value === savedModel) ? savedModel : opts[0].value;
}

type KeyMode = 'viewing' | 'editing';

export default function SettingsPanel({ publicSettings, onSave }: Props) {
  const [provider, setProvider] = useState<Provider>(publicSettings.provider);
  const [model, setModel] = useState(getInitialModel(publicSettings.provider, publicSettings.model));
  const [theme, setTheme] = useState<Theme>(publicSettings.theme ?? 'system');
  const [saving, setSaving] = useState(false);

  // Per-provider key state: mode and draft value.
  const [keyModes, setKeyModes] = useState<Record<Provider, KeyMode>>(() => ({
    openai: publicSettings.hasApiKey.openai ? 'viewing' : 'editing',
    anthropic: publicSettings.hasApiKey.anthropic ? 'viewing' : 'editing',
    gemini: publicSettings.hasApiKey.gemini ? 'viewing' : 'editing',
  }));
  const [draftKeys, setDraftKeys] = useState<Record<Provider, string>>({
    openai: '',
    anthropic: '',
    gemini: '',
  });
  const [showKey, setShowKey] = useState(false);

  // Derived values for the currently visible provider.
  const keyMode = keyModes[provider];
  const hasKey = publicSettings.hasApiKey[provider];
  const preview = publicSettings.apiKeyPreviews[provider];

  const maskedValue = showKey ? `••••••••••${preview}` : '••••••••••••••';
  const displayValue = keyMode === 'viewing' ? maskedValue : draftKeys[provider];
  const inputType = keyMode === 'viewing' ? 'text' : showKey ? 'text' : 'password';

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setModel(MODEL_OPTIONS[p][0].value);
    setShowKey(false);
  };

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    // Apply immediately so the user sees the change before clicking Save.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const dark = t === 'dark' || (t === 'system' && mq.matches);
    document.documentElement.classList.toggle('dark', dark);
  };

  const handleKeyFocus = () => {
    if (keyMode === 'viewing') {
      setKeyModes((m) => ({ ...m, [provider]: 'editing' }));
      setDraftKeys((d) => ({ ...d, [provider]: '' }));
      setShowKey(false);
    }
  };

  const handleKeyBlur = () => {
    // If user clicked away without typing and a key exists, revert to viewing.
    if (keyMode === 'editing' && draftKeys[provider] === '' && hasKey) {
      setKeyModes((m) => ({ ...m, [provider]: 'viewing' }));
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (keyMode === 'editing') {
      setDraftKeys((d) => ({ ...d, [provider]: e.target.value }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    onSave({
      apiKeys: {
        openai: draftKeys.openai.trim(),
        anthropic: draftKeys.anthropic.trim(),
        gemini: draftKeys.gemini.trim(),
      },
      model,
      provider,
      theme,
    });
    setSaving(false);
  };

  const selectClass =
    'w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-900 shadow-sm transition hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600';

  const chevron = (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="space-y-4">
      {/* Default provider */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
          Default provider
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['openai', 'anthropic', 'gemini'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                provider === p
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Model */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Model</label>
        <div className="relative">
          <select value={model} onChange={(e) => setModel(e.target.value)} className={selectClass}>
            {MODEL_OPTIONS[provider].map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {chevron}
        </div>
      </div>

      {/* API Key — per-provider, view/edit mode */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            API key <span className="font-normal text-slate-400 dark:text-slate-500">({PROVIDER_LABELS[provider]})</span>
          </label>
          {hasKey && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Key saved
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type={inputType}
            value={displayValue}
            readOnly={keyMode === 'viewing'}
            onFocus={handleKeyFocus}
            onBlur={handleKeyBlur}
            onChange={handleKeyChange}
            placeholder={
              keyMode === 'editing' && !hasKey
                ? provider === 'gemini'
                  ? 'AIza...'
                  : 'sk-...'
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
            className={`w-full rounded-lg border px-3 py-2 pr-20 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-100 dark:placeholder:text-slate-500 ${
              keyMode === 'viewing'
                ? 'cursor-pointer border-slate-200 bg-slate-50 text-slate-500 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400'
                : 'border-brand-400 bg-white text-slate-900 focus:border-brand-500 dark:border-brand-600 dark:bg-slate-800 dark:text-slate-100'
            }`}
          />
          {/* Show/Hide — always visible */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()} // don't steal focus from input
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        {keyMode === 'viewing' && (
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Click the field to change your key.</p>
        )}
        {keyMode === 'editing' && hasKey && (
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Click away to cancel and keep your saved key.</p>
        )}
      </div>

      {/* Theme */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Theme</label>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                theme === t.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>

      {provider === 'gemini' && (
        <div className="rounded-lg bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <strong>Free tier:</strong> Get a free API key at{' '}
          <span className="font-mono text-[10px]">aistudio.google.com</span>. No credit card required.
        </div>
      )}

      <div className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <strong className="text-slate-900 dark:text-slate-200">Privacy:</strong> Your API keys are stored locally via{' '}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px] dark:bg-slate-700 dark:text-slate-300">
          chrome.storage.local
        </code>{' '}
        and are only sent to the provider you select. They never leave your browser for anything else.
      </div>
    </div>
  );
}

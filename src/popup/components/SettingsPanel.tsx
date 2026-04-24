import { useState } from 'react';
import type { PublicSettings, Provider, Settings } from '../../types';

interface Props {
  publicSettings: PublicSettings;
  onSave: (settings: Settings) => void;
}

const MODEL_DEFAULTS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
};

export default function SettingsPanel({ publicSettings, onSave }: Props) {
  const [provider, setProvider] = useState<Provider>(publicSettings.provider);
  const [model, setModel] = useState(publicSettings.model);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setModel(MODEL_DEFAULTS[p]);
  };

  const handleSave = async () => {
    if (!apiKey.trim() && !publicSettings.hasApiKey) return;
    setSaving(true);
    onSave({
      // If user left the key field blank but already has one saved,
      // we preserve it by sending empty string; the background treats
      // this as "use existing". Simpler: require re-entry when rotating.
      apiKey: apiKey.trim(),
      provider,
      model: model.trim() || MODEL_DEFAULTS[provider],
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700">Provider</label>
        <div className="grid grid-cols-2 gap-2">
          {(['openai', 'anthropic'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                provider === p
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {p === 'openai' ? 'OpenAI' : 'Anthropic'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700">Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={MODEL_DEFAULTS[provider]}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-700">API key</label>
          {publicSettings.hasApiKey && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Key saved
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={publicSettings.hasApiKey ? '•••••••••• (enter new key to replace)' : 'sk-...'}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-16 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || (!apiKey.trim() && !publicSettings.hasApiKey)}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>

      <div className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
        <strong className="text-slate-900">Privacy:</strong> Your API key is stored locally via{' '}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px]">
          chrome.storage.local
        </code>{' '}
        and is only sent to the provider you select. It never leaves your browser for anything else.
      </div>
    </div>
  );
}

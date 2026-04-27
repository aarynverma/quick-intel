import { useCallback, useEffect, useState } from 'react';
import type {
  Provider,
  PublicSettings,
  RuntimeMessage,
  RuntimeResponse,
  Settings,
  SummaryRecord,
  SummaryStyle,
} from '../types';
import Header from './components/Header';
import TabBar from './components/TabBar';
import SummaryCard from './components/SummaryCard';
import SummarySkeleton from './components/SummarySkeleton';
import HistoryList from './components/HistoryList';
import StyleDropdown from './components/StyleDropdown';
import SettingsPanel from './components/SettingsPanel';
import ErrorBanner from './components/ErrorBanner';
import Welcome from './components/Welcome';

function sendMessage<T = unknown>(message: RuntimeMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: RuntimeResponse<T>) => {
      if (chrome.runtime.lastError) {
        reject({ code: 'UNKNOWN', message: chrome.runtime.lastError.message ?? 'Runtime error' });
        return;
      }
      if (!response) {
        reject({ code: 'UNKNOWN', message: 'No response from background.' });
        return;
      }
      if (response.ok) resolve(response.data);
      else reject(response.error);
    });
  });
}

const PROVIDERS: Provider[] = ['openai', 'anthropic', 'gemini'];
const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
};

type TabId = 'summarize' | 'history' | 'settings';
type ErrShape = { code: string; message: string };

export default function App() {
  const [tab, setTab] = useState<TabId>('summarize');
  const [style, setStyle] = useState<SummaryStyle>('tldr');
  const [loading, setLoading] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<SummaryRecord | null>(null);
  const [history, setHistory] = useState<SummaryRecord[]>([]);
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null);
  const [error, setError] = useState<ErrShape | null>(null);
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  // Per-session provider override — null means use the saved default.
  const [providerOverride, setProviderOverride] = useState<Provider | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [hist, ps] = await Promise.all([
        sendMessage<SummaryRecord[]>({ type: 'GET_HISTORY' }),
        sendMessage<PublicSettings>({ type: 'GET_PUBLIC_SETTINGS' }),
      ]);
      setHistory(hist);
      setPublicSettings(ps);
    } catch (e) {
      setError(e as ErrShape);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reset session provider selection when the saved default changes.
  useEffect(() => {
    setProviderOverride(null);
  }, [publicSettings?.provider]);

  const configuredProviders = publicSettings
    ? PROVIDERS.filter((p) => publicSettings.hasApiKey[p])
    : [];

  // Show Welcome screen only when no provider has any key configured.
  const needsApiKey = publicSettings !== null && configuredProviders.length === 0;

  const handleSummarize = async () => {
    setError(null);
    setLoading(true);
    setCurrentSummary(null);
    try {
      const record = await sendMessage<SummaryRecord>({
        type: 'SUMMARIZE_ACTIVE_TAB',
        style,
        customInstructions: customInstructions.trim() || undefined,
        providerOverride: providerOverride ?? undefined,
      });
      setCurrentSummary(record);
      const hist = await sendMessage<SummaryRecord[]>({ type: 'GET_HISTORY' });
      setHistory(hist);
    } catch (e) {
      const err = e as ErrShape;
      setError(err);
      if (err.code === 'NO_API_KEY') setTab('settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    await sendMessage({ type: 'DELETE_HISTORY_ITEM', id });
    const hist = await sendMessage<SummaryRecord[]>({ type: 'GET_HISTORY' });
    setHistory(hist);
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all history?')) return;
    await sendMessage({ type: 'CLEAR_HISTORY' });
    setHistory([]);
  };

  const handleSaveSettings = async (newSettings: Settings) => {
    await sendMessage({ type: 'SAVE_SETTINGS', settings: newSettings });
    await refresh();
    setError(null);
    setTab('summarize');
  };

  const handleSelectHistory = (record: SummaryRecord) => {
    setCurrentSummary(record);
    setTab('summarize');
  };

  const activeProvider = providerOverride ?? publicSettings?.provider;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <Header />
      <TabBar
        active={tab}
        onChange={setTab}
        historyCount={history.length}
        needsSetup={needsApiKey}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'summarize' && needsApiKey && (
          <Welcome onGetStarted={() => setTab('settings')} />
        )}

        {tab === 'summarize' && !needsApiKey && (
          <div className="space-y-4">
            {/* Per-session provider selector — only shown when 2+ keys are configured */}
            {configuredProviders.length >= 2 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Provider
                </p>
                <div className="flex gap-1">
                  {configuredProviders.map((p) => (
                    <button
                      key={p}
                      onClick={() => setProviderOverride(p)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                        activeProvider === p
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {PROVIDER_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <StyleDropdown value={style} onChange={setStyle} disabled={loading} />

            {/* Custom instructions — collapsed by default */}
            <div>
              <button
                type="button"
                onClick={() => setShowCustomPrompt((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Customize prompt
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${showCustomPrompt ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              {showCustomPrompt && (
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={`e.g., "Focus on technical details" or "Explain like I'm 5"`}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              )}
            </div>

            <button
              onClick={handleSummarize}
              disabled={loading}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? 'Summarizing…' : 'Summarize this page'}
            </button>

            {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

            {loading && <SummarySkeleton />}

            {currentSummary && !loading && <SummaryCard record={currentSummary} />}

            {!loading && !currentSummary && !error && (
              <p className="pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
                Pick a style, then click summarize. Your API key stays on this device.
              </p>
            )}
          </div>
        )}

        {tab === 'history' && (
          <HistoryList
            items={history}
            onSelect={handleSelectHistory}
            onDelete={handleDeleteItem}
            onClearAll={handleClearHistory}
          />
        )}

        {tab === 'settings' && publicSettings && (
          <SettingsPanel publicSettings={publicSettings} onSave={handleSaveSettings} />
        )}
      </div>
    </div>
  );
}

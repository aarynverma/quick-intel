import { useCallback, useEffect, useState } from 'react';
import type {
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

  const handleSummarize = async () => {
    setError(null);
    setLoading(true);
    setCurrentSummary(null);
    try {
      const record = await sendMessage<SummaryRecord>({
        type: 'SUMMARIZE_ACTIVE_TAB',
        style,
      });
      setCurrentSummary(record);
      const hist = await sendMessage<SummaryRecord[]>({ type: 'GET_HISTORY' });
      setHistory(hist);
    } catch (e) {
      const err = e as ErrShape;
      setError(err);
      // Nudge users to the right tab when the problem is config.
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

  const needsApiKey = publicSettings !== null && !publicSettings.hasApiKey;

  return (
    <div className="flex h-full flex-col bg-white">
      <Header />
      <TabBar
        active={tab}
        onChange={setTab}
        historyCount={history.length}
        needsSetup={needsApiKey}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'summarize' && needsApiKey && (
          <Welcome onGetStarted={() => setTab('settings')} />
        )}

        {tab === 'summarize' && !needsApiKey && (
          <div className="space-y-4">
            <StyleDropdown value={style} onChange={setStyle} disabled={loading} />

            <button
              onClick={handleSummarize}
              disabled={loading || needsApiKey}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? 'Summarizing…' : 'Summarize this page'}
            </button>

            {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

            {loading && <SummarySkeleton />}

            {currentSummary && !loading && <SummaryCard record={currentSummary} />}

            {!loading && !currentSummary && !error && (
              <p className="pt-2 text-center text-xs text-slate-400">
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

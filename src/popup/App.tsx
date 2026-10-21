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
  openai:    'GPT-4o',
  anthropic: 'Claude',
  gemini:    'Gemini',
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
    if (new URLSearchParams(window.location.search).get('tab') === 'settings') {
      setTab('settings');
    }
  }, [refresh]);

  useEffect(() => {
    setProviderOverride(null);
  }, [publicSettings?.provider]);

  const configuredProviders = publicSettings
    ? PROVIDERS.filter((p) => publicSettings.hasApiKey[p])
    : [];

  const needsApiKey = publicSettings !== null && configuredProviders.length === 0;

  const activeProvider = providerOverride ?? publicSettings?.provider;

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

  const handleResumeEnhancer = async () => {
    await sendMessage({ type: 'PAUSE_ENHANCER', hours: 0 });
    await refresh();
  };

  const handleSelectHistory = (record: SummaryRecord) => {
    setCurrentSummary(record);
    setTab('summarize');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--qi-bg)' }}>
      <Header onSettingsClick={() => setTab('settings')} />
      <TabBar
        active={tab}
        onChange={setTab}
        historyCount={history.length}
        needsSetup={needsApiKey}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 14px 20px' }}>
        {tab === 'summarize' && needsApiKey && (
          <Welcome onGetStarted={() => setTab('settings')} />
        )}

        {tab === 'summarize' && !needsApiKey && (
          <div>
            {/* Per-session provider selector — only shown when 2+ keys configured */}
            {configuredProviders.length >= 2 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontFamily: 'var(--qi-mono)', fontSize: 10, letterSpacing: '.14em',
                  textTransform: 'uppercase', color: 'var(--qi-muted)',
                  marginBottom: 8,
                }}>Provider</div>
                <div className="qi-seg">
                  {configuredProviders.map((p) => (
                    <button
                      key={p}
                      className={activeProvider === p ? 'active' : ''}
                      onClick={() => setProviderOverride(p)}
                    >
                      {PROVIDER_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <StyleDropdown value={style} onChange={setStyle} disabled={loading} />

            {/* Custom instructions */}
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowCustomPrompt((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--qi-mono)', fontSize: 10, letterSpacing: '.1em',
                  textTransform: 'uppercase', color: 'var(--qi-muted)',
                  padding: 0,
                  transition: 'color .15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--qi-text)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--qi-muted)'; }}
              >
                Customize prompt
                <svg
                  style={{ width: 10, height: 10, transition: 'transform .15s ease', transform: showCustomPrompt ? 'rotate(180deg)' : 'rotate(0)' }}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showCustomPrompt && (
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={`e.g., "Focus on technical details" or "Explain like I'm 5"`}
                  rows={3}
                  style={{
                    marginTop: 8,
                    width: '100%',
                    resize: 'none',
                    borderRadius: 10,
                    border: '1px solid var(--qi-border)',
                    background: 'var(--qi-s1)',
                    color: 'var(--qi-text)',
                    fontSize: 12.5,
                    fontWeight: 500,
                    lineHeight: 1.5,
                    fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    padding: '10px 12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color .15s ease, box-shadow .15s ease',
                  }}
                  onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                    e.currentTarget.style.borderColor = 'rgba(91,94,244,.6)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,94,244,.12)';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                    e.currentTarget.style.borderColor = 'var(--qi-border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              )}
            </div>

            <button
              className={`qi-cta${!loading && !currentSummary ? ' qi-cta-pulse' : ''}`}
              onClick={handleSummarize}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Summarizing…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }} aria-hidden="true">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                  </svg>
                  Summarize this page
                </>
              )}
            </button>

            {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

            {loading && <SummarySkeleton />}

            {currentSummary && !loading && <SummaryCard record={currentSummary} />}

            {!loading && !currentSummary && !error && (
              <p style={{
                textAlign: 'center', fontSize: 11, color: 'var(--qi-muted2)',
                marginTop: 18, lineHeight: 1.5,
              }}>
                Pick a style, then click summarize.<br />
                Your API key stays on this device.
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
          <SettingsPanel
            publicSettings={publicSettings}
            onSave={handleSaveSettings}
            onResumeEnhancer={handleResumeEnhancer}
          />
        )}
      </div>
    </div>
  );
}

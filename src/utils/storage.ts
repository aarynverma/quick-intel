// Typed wrapper around chrome.storage.local.
// Only the service worker imports this — the popup gets a redacted view.

import type { Provider, Settings, SummaryRecord, PublicSettings } from '../types';

const HISTORY_KEY = 'summary_history';
const SETTINGS_KEY = 'settings';
const MAX_HISTORY_ITEMS = 50;

const PROVIDERS: Provider[] = ['openai', 'anthropic', 'gemini'];

const DEFAULT_SETTINGS: Settings = {
  apiKeys: { openai: '', anthropic: '', gemini: '' },
  model: import.meta.env.VITE_DEFAULT_MODEL ?? 'gpt-4o-mini',
  provider: (import.meta.env.VITE_DEFAULT_PROVIDER as Settings['provider']) ?? 'openai',
  theme: 'system',
};

export async function getHistory(): Promise<SummaryRecord[]> {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  const items = (result[HISTORY_KEY] ?? []) as SummaryRecord[];
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addHistoryItem(record: SummaryRecord): Promise<void> {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  const current = (result[HISTORY_KEY] ?? []) as SummaryRecord[];
  const next = [record, ...current].slice(0, MAX_HISTORY_ITEMS);
  await chrome.storage.local.set({ [HISTORY_KEY]: next });
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  const current = (result[HISTORY_KEY] ?? []) as SummaryRecord[];
  await chrome.storage.local.set({
    [HISTORY_KEY]: current.filter((item) => item.id !== id),
  });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_KEY]: [] });
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const raw = (result[SETTINGS_KEY] ?? {}) as Record<string, unknown>;

  // One-time migration: old single apiKey → per-provider apiKeys map.
  if ('apiKey' in raw && typeof raw.apiKey === 'string' && !('apiKeys' in raw)) {
    const provider = (raw.provider as Provider) ?? DEFAULT_SETTINGS.provider;
    raw.apiKeys = { openai: '', anthropic: '', gemini: '', [provider]: raw.apiKey };
    delete raw.apiKey;
    await chrome.storage.local.set({ [SETTINGS_KEY]: raw });
  }

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    apiKeys: {
      ...DEFAULT_SETTINGS.apiKeys,
      ...((raw.apiKeys as Partial<Record<Provider, string>>) ?? {}),
    },
  };
}

// Redacted projection safe to send to the popup — no raw key values.
export async function getPublicSettings(): Promise<PublicSettings> {
  const s = await getSettings();
  const hasApiKey = Object.fromEntries(
    PROVIDERS.map((p) => [p, Boolean(s.apiKeys[p])]),
  ) as Record<Provider, boolean>;
  const apiKeyPreviews = Object.fromEntries(
    PROVIDERS.map((p) => [p, s.apiKeys[p] ? s.apiKeys[p].slice(-4) : '']),
  ) as Record<Provider, string>;
  return {
    hasApiKey,
    apiKeyPreviews,
    model: s.model,
    provider: s.provider,
    theme: s.theme ?? 'system',
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const existing = await getSettings();
  // Preserve each provider's existing key when the popup sends '' (field unchanged).
  const clean: Settings = {
    apiKeys: {
      openai: settings.apiKeys.openai.trim() || existing.apiKeys.openai,
      anthropic: settings.apiKeys.anthropic.trim() || existing.apiKeys.anthropic,
      gemini: settings.apiKeys.gemini.trim() || existing.apiKeys.gemini,
    },
    model: settings.model.trim(),
    provider: settings.provider,
    theme: settings.theme,
  };
  await chrome.storage.local.set({ [SETTINGS_KEY]: clean });
}

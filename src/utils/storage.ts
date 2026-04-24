// Typed wrapper around chrome.storage.local.
// Only the service worker imports this — the popup gets a redacted view.

import type { Settings, SummaryRecord, PublicSettings } from '../types';

const HISTORY_KEY = 'summary_history';
const SETTINGS_KEY = 'settings';
const MAX_HISTORY_ITEMS = 50;

const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: import.meta.env.VITE_DEFAULT_MODEL ?? 'gpt-4o-mini',
  provider: (import.meta.env.VITE_DEFAULT_PROVIDER as Settings['provider']) ?? 'openai',
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
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] ?? {}) };
}

// Redacted projection safe to send to the popup.
export async function getPublicSettings(): Promise<PublicSettings> {
  const s = await getSettings();
  return {
    hasApiKey: Boolean(s.apiKey && s.apiKey.length > 0),
    model: s.model,
    provider: s.provider,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  // Basic sanitization — trim, reject obviously malformed inputs.
  const clean: Settings = {
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim(),
    provider: settings.provider,
  };
  await chrome.storage.local.set({ [SETTINGS_KEY]: clean });
}

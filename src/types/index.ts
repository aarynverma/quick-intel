// Shared types. Keep this file small and stable — it's imported by every surface.

export type SummaryStyle = 'tldr' | 'bullets' | 'detailed';

export type Provider = 'openai' | 'anthropic' | 'gemini';

export type Theme = 'system' | 'light' | 'dark';

export interface SummaryRecord {
  id: string;
  url: string;
  title: string;
  style: SummaryStyle;
  content: string;
  createdAt: number;
}

export interface ExtractedContent {
  url: string;
  title: string;
  text: string;
}

export interface Settings {
  apiKeys: Record<Provider, string>;
  model: string;
  provider: Provider;
  theme: Theme;
}

// Public settings view returned to the popup — NEVER contains raw API keys.
export interface PublicSettings {
  hasApiKey: Record<Provider, boolean>;
  apiKeyPreviews: Record<Provider, string>; // last 4 chars, or '' if no key
  model: string;
  provider: Provider;
  theme: Theme;
}

// Discriminated union for all popup <-> background messages.
export type RuntimeMessage =
  | { type: 'SUMMARIZE_ACTIVE_TAB'; style: SummaryStyle; customInstructions?: string; providerOverride?: Provider }
  | { type: 'GET_HISTORY' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'DELETE_HISTORY_ITEM'; id: string }
  | { type: 'GET_PUBLIC_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Settings };

export type RuntimeResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

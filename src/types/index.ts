// Shared types. Keep this file small and stable — it's imported by every surface.

export type SummaryStyle = 'tldr' | 'bullets' | 'detailed';

export type Provider = 'openai' | 'anthropic';

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
  apiKey: string;
  model: string;
  provider: Provider;
}

// Public settings view returned to the popup — NEVER contains the raw API key.
// The popup only needs to know whether a key is configured.
export interface PublicSettings {
  hasApiKey: boolean;
  model: string;
  provider: Provider;
}

// Discriminated union for all popup <-> background messages.
export type RuntimeMessage =
  | { type: 'SUMMARIZE_ACTIVE_TAB'; style: SummaryStyle }
  | { type: 'GET_HISTORY' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'DELETE_HISTORY_ITEM'; id: string }
  | { type: 'GET_PUBLIC_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Settings };

export type RuntimeResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

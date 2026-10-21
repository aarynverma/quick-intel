// MV3 service worker. Event-driven; no persistent state in memory.
// All sensitive operations (API calls, key access) happen HERE, not in the popup.

import { extractPageContent } from '../content/extractor';
import { summarize } from '../utils/llm';
import { enhancePrompt, generateQuestions } from '../utils/prompt-enhancer';
import {
  addHistoryItem,
  clearHistory,
  deleteHistoryItem,
  getHistory,
  getPublicSettings,
  getSettings,
  saveSettings,
} from '../utils/storage';
import { AppError, toAppError } from '../utils/errors';
import { isRestrictedUrl } from '../utils/url-guard';
import { logger } from '../utils/logger';
import type { Provider, RuntimeMessage, RuntimeResponse, SummaryRecord } from '../types';

const SETTINGS_KEY = 'settings';

chrome.runtime.onInstalled.addListener((details) => {
  logger.debug('Installed/updated:', details.reason);
});

// Hotkey → forward TRIGGER_ENHANCE to the active tab's content script.
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'enhance-prompt' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_ENHANCE' }).catch(() => {
      // Content script not loaded on restricted pages — silently ignore.
    });
  }
});

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse: (r: RuntimeResponse) => void) => {
    handleMessage(message)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err: unknown) => {
        const appErr = toAppError(err);
        logger.error('Handler error:', appErr.code, appErr.message);
        sendResponse({ ok: false, error: appErr.toSerializable() });
      });
    // Keep the message channel open for async sendResponse.
    return true;
  },
);

async function handleMessage(message: RuntimeMessage): Promise<unknown> {
  switch (message.type) {
    case 'SUMMARIZE_ACTIVE_TAB':
      return summarizeActiveTab(message.style, message.customInstructions, message.providerOverride);

    case 'ENHANCE_PROMPT': {
      const settings = await getSettings();
      const enhanced = await enhancePrompt(message.text, settings, message.providerOverride, message.answers);
      return { enhanced };
    }

    case 'GENERATE_QUESTIONS': {
      const settings = await getSettings();
      const questions = await generateQuestions(message.text, settings, message.providerOverride);
      return { questions };
    }

    case 'DISABLE_SITE': {
      // Targeted write — only modifies enhancer.disabledDomains, never touches API keys.
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      const raw = (result[SETTINGS_KEY] ?? {}) as Record<string, unknown>;
      const enhancer = (raw.enhancer as { enabled: boolean; disabledDomains: string[] } | undefined) ?? {
        enabled: true,
        disabledDomains: [],
      };
      if (!enhancer.disabledDomains.includes(message.domain)) {
        enhancer.disabledDomains = [...enhancer.disabledDomains, message.domain];
        raw.enhancer = enhancer;
        await chrome.storage.local.set({ [SETTINGS_KEY]: raw });
      }
      return { done: true };
    }

    case 'OPEN_POPUP': {
      const tabParam = message.tab ?? 'settings';
      const popupUrl = chrome.runtime.getURL('src/popup/index.html') + `?tab=${tabParam}`;
      try {
        await chrome.action.openPopup();
      } catch {
        await chrome.tabs.create({ url: popupUrl });
      }
      return { done: true };
    }

    case 'PAUSE_ENHANCER': {
      const pausedUntil = message.hours > 0 ? Date.now() + message.hours * 3_600_000 : 0;
      await chrome.storage.local.set({ enhancer_paused_until: pausedUntil });
      return { pausedUntil };
    }

    case 'GET_HISTORY':
      return getHistory();
    case 'CLEAR_HISTORY':
      await clearHistory();
      return { cleared: true };
    case 'DELETE_HISTORY_ITEM':
      await deleteHistoryItem(message.id);
      return { deleted: true };
    case 'GET_PUBLIC_SETTINGS':
      return getPublicSettings();
    case 'SAVE_SETTINGS':
      await saveSettings(message.settings);
      return { saved: true };

    default: {
      const _exhaustive: never = message;
      throw new AppError('UNKNOWN', `Unknown message: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

async function summarizeActiveTab(
  style: SummaryRecord['style'],
  customInstructions?: string,
  providerOverride?: Provider,
): Promise<SummaryRecord> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new AppError('NO_ACTIVE_TAB', 'No active tab found.');

  if (isRestrictedUrl(tab.url)) {
    throw new AppError(
      'RESTRICTED_PAGE',
      "This page can't be summarized (browser-internal or restricted URL).",
    );
  }

  let injectionResults: chrome.scripting.InjectionResult<ReturnType<typeof extractPageContent>>[];
  try {
    injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError('INJECTION_FAILED', `Could not read page: ${message}`);
  }

  const extracted = injectionResults[0]?.result;
  if (!extracted || !extracted.text || extracted.text.length < 50) {
    throw new AppError('EMPTY_CONTENT', 'Could not extract enough content from this page.');
  }

  const settings = await getSettings();
  const summaryText = await summarize({
    text: extracted.text,
    title: extracted.title,
    style,
    settings,
    customInstructions,
    providerOverride,
  });

  const record: SummaryRecord = {
    id: crypto.randomUUID(),
    url: extracted.url,
    title: extracted.title,
    style,
    content: summaryText,
    createdAt: Date.now(),
  };

  await addHistoryItem(record);
  return record;
}

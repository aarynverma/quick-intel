// LLM integration. Runs ONLY in the service worker — the popup never imports this.
// Adding a provider = add a branch + a call<Provider>() function + validate its response.

import type { Settings, SummaryStyle } from '../types';
import { AppError } from './errors';

interface SummarizeParams {
  text: string;
  title: string;
  style: SummaryStyle;
  settings: Settings;
}

const STYLE_INSTRUCTIONS: Record<SummaryStyle, string> = {
  tldr:
    'Provide a concise TL;DR summary in 2-3 sentences. Focus on the single most important takeaway.',
  bullets:
    'Provide a bullet-point summary with 5-8 bullets. Each bullet starts with "- " and is a complete thought.',
  detailed:
    'Provide a detailed multi-paragraph summary (3-5 paragraphs). Cover main arguments, supporting evidence, and conclusions.',
};

const MAX_INPUT_CHARS = 40_000;

function buildPrompt(text: string, title: string, style: SummaryStyle): string {
  const truncated =
    text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) + '...[truncated]' : text;

  return `You are summarizing a web page titled: "${title}".

${STYLE_INSTRUCTIONS[style]}

Write the summary directly — no meta-commentary like "This article is about...".

--- PAGE CONTENT ---
${truncated}
--- END CONTENT ---`;
}

export async function summarize({
  text,
  title,
  style,
  settings,
}: SummarizeParams): Promise<string> {
  if (!settings.apiKey) {
    throw new AppError('NO_API_KEY', 'No API key configured. Open Settings to add one.');
  }

  const prompt = buildPrompt(text, title, style);

  try {
    if (settings.provider === 'openai') return await callOpenAI(prompt, settings);
    if (settings.provider === 'anthropic') return await callAnthropic(prompt, settings);
    throw new AppError('API_ERROR', `Unsupported provider: ${settings.provider}`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError('API_ERROR', `Network or API failure: ${message}`);
  }
}

async function callOpenAI(prompt: string, settings: Settings): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful summarization assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await safeReadText(response);
    throw new AppError('API_ERROR', `OpenAI API error (${response.status}): ${errText}`);
  }

  const json = (await response.json()) as unknown;
  return validateOpenAIResponse(json);
}

async function callAnthropic(prompt: string, settings: Settings): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await safeReadText(response);
    throw new AppError('API_ERROR', `Anthropic API error (${response.status}): ${errText}`);
  }

  const json = (await response.json()) as unknown;
  return validateAnthropicResponse(json);
}

// --- Response validators --------------------------------------------------
// We explicitly shape-check before trusting the JSON. A malformed response
// from either API surfaces as INVALID_RESPONSE rather than a silent crash.

function validateOpenAIResponse(json: unknown): string {
  if (!isRecord(json)) throw new AppError('INVALID_RESPONSE', 'OpenAI: response was not an object.');
  const choices = json.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new AppError('INVALID_RESPONSE', 'OpenAI: missing choices.');
  }
  const first = choices[0];
  if (!isRecord(first) || !isRecord(first.message)) {
    throw new AppError('INVALID_RESPONSE', 'OpenAI: malformed choice.');
  }
  const content = first.message.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new AppError('INVALID_RESPONSE', 'OpenAI: empty content.');
  }
  return content.trim();
}

function validateAnthropicResponse(json: unknown): string {
  if (!isRecord(json)) throw new AppError('INVALID_RESPONSE', 'Anthropic: response was not an object.');
  const content = json.content;
  if (!Array.isArray(content) || content.length === 0) {
    throw new AppError('INVALID_RESPONSE', 'Anthropic: missing content array.');
  }
  const first = content[0];
  if (!isRecord(first) || typeof first.text !== 'string' || first.text.trim().length === 0) {
    throw new AppError('INVALID_RESPONSE', 'Anthropic: empty text.');
  }
  return first.text.trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return '<unreadable>';
  }
}

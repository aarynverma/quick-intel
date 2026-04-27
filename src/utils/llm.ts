// LLM integration. Runs ONLY in the service worker — the popup never imports this.
// Adding a provider = add a branch + a call<Provider>() function + validate its response.

import type { Provider, Settings, SummaryStyle } from '../types';
import { AppError } from './errors';

interface SummarizeParams {
  text: string;
  title: string;
  style: SummaryStyle;
  settings: Settings;
  customInstructions?: string;
  providerOverride?: Provider;
}

const SYSTEM_PROMPT = `You are a sharp, articulate summarization expert. Your job is to distill web content into summaries that respect the reader's time and intelligence.

Principles:
- Lead with the most important information; never bury the lede.
- Use specific facts, numbers, names, and dates from the source — vague summaries are useless.
- Match the source's register: technical content gets technical language; casual content stays approachable.
- Preserve nuance and qualifiers when they matter (e.g., "early research suggests" vs "scientists proved").
- Cut filler ruthlessly. No "this article discusses..." or "in conclusion..." phrases.
- If the content has a clear argument or thesis, surface it. If it's news, lead with what happened. If it's a tutorial, lead with what the reader will learn.
- Be honest about uncertainty — if the source itself is speculative or opinion, signal that.

Write summaries the reader can act on.`;

const STYLE_INSTRUCTIONS: Record<SummaryStyle, string> = {
  tldr:
    'Provide a concise TL;DR summary in 2-3 sentences. Focus on the single most important takeaway.',
  bullets:
    'Provide a bullet-point summary with 5-8 bullets. Each bullet starts with "- " and is a complete thought.',
  detailed:
    'Provide a detailed multi-paragraph summary (3-5 paragraphs). Cover main arguments, supporting evidence, and conclusions.',
};

const MAX_INPUT_CHARS = 40_000;

function buildPrompt(text: string, title: string, style: SummaryStyle, customInstructions?: string): string {
  const truncated =
    text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) + '...[truncated]' : text;

  let prompt = `You are summarizing a web page titled: "${title}".

${STYLE_INSTRUCTIONS[style]}

Write the summary directly — no meta-commentary like "This article is about...".`;

  if (customInstructions?.trim()) {
    prompt += `\n\nAdditional instructions from the user:\n${customInstructions.trim()}`;
  }

  prompt += `\n\n--- PAGE CONTENT ---\n${truncated}\n--- END CONTENT ---`;

  return prompt;
}

export async function summarize({
  text,
  title,
  style,
  settings,
  customInstructions,
  providerOverride,
}: SummarizeParams): Promise<string> {
  const effectiveProvider = providerOverride ?? settings.provider;
  const apiKey = settings.apiKeys[effectiveProvider];

  if (!apiKey) {
    throw new AppError(
      'NO_API_KEY',
      `No API key configured for ${effectiveProvider}. Open Settings to add one.`,
    );
  }

  const prompt = buildPrompt(text, title, style, customInstructions);
  const model = settings.model;

  try {
    if (effectiveProvider === 'openai') return await callOpenAI(prompt, apiKey, model);
    if (effectiveProvider === 'anthropic') return await callAnthropic(prompt, apiKey, model);
    if (effectiveProvider === 'gemini') return await callGemini(prompt, apiKey, model);
    throw new AppError('API_ERROR', `Unsupported provider: ${effectiveProvider}`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError('API_ERROR', `Network or API failure: ${message}`);
  }
}

async function callOpenAI(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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

async function callAnthropic(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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

async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  const m = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const errText = await safeReadText(response);
    throw new AppError('API_ERROR', `Gemini API error (${response.status}): ${errText}`);
  }

  const json = (await response.json()) as unknown;
  return validateGeminiResponse(json);
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

function validateGeminiResponse(json: unknown): string {
  if (!isRecord(json)) throw new AppError('INVALID_RESPONSE', 'Gemini: response was not an object.');
  const candidates = json.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new AppError('INVALID_RESPONSE', 'Gemini: missing candidates.');
  }
  const first = candidates[0];
  if (!isRecord(first) || !isRecord(first.content)) {
    throw new AppError('INVALID_RESPONSE', 'Gemini: malformed candidate.');
  }
  const parts = first.content.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new AppError('INVALID_RESPONSE', 'Gemini: missing parts.');
  }
  const text = (parts[0] as Record<string, unknown>).text;
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new AppError('INVALID_RESPONSE', 'Gemini: empty text.');
  }
  return text.trim();
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

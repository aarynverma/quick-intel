// Prompt enhancement utility. Runs ONLY in the service worker.
// Mirrors llm.ts structure but uses a different system prompt and lower max_tokens.

import type { Provider, Settings } from '../types';
import { AppError } from './errors';

const SYSTEM_PROMPT = `You are an expert at transforming rough, vague, or underspecified prompts into clear, effective ones that get great results from AI assistants.

Given the user's draft prompt, rewrite it to be:
- Specific: replace vague requests with concrete asks
- Structured: add context, constraints, examples, and desired output format when helpful
- Concise: no fluff, no preamble
- Goal-oriented: clarify what success looks like

Preserve the user's intent and voice. Don't add information they didn't imply. Don't make the prompt longer just to seem more thorough — only add what genuinely improves the result.

Output ONLY the rewritten prompt. No explanations, no "Here's an improved version:", no quotes around it. Just the prompt itself, ready to use.`;

const QUESTIONS_SYSTEM_PROMPT = `You help users clarify vague AI prompts before enhancement. Given a draft prompt, generate 1-3 short, focused clarifying questions. For each question also provide exactly 2 short, relevant suggested answers (5-8 words each) that cover the most likely choices. Focus on the most impactful unknowns: goal/outcome, target audience, output format, or key constraints. If the prompt is already clear, return [].

Return ONLY a JSON array. Example:
[{"question":"Who is the target audience?","suggestions":["Software developers","Business executives"]},{"question":"What format should the output be?","suggestions":["Bullet point list","Detailed paragraphs"]}]`;

export async function enhancePrompt(
  text: string,
  settings: Settings,
  providerOverride?: Provider,
  answers?: string[],
): Promise<string> {
  const effectiveProvider = providerOverride ?? settings.provider;
  const apiKey = settings.apiKeys[effectiveProvider];

  if (!apiKey) {
    throw new AppError(
      'NO_API_KEY',
      `No API key configured for ${effectiveProvider}. Open Settings to add one.`,
    );
  }

  const model = settings.model;
  const userContent = answers?.length
    ? `${text}\n\nAdditional context:\n${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
    : text;

  try {
    if (effectiveProvider === 'openai') return await callOpenAI(userContent, apiKey, model);
    if (effectiveProvider === 'anthropic') return await callAnthropic(userContent, apiKey, model);
    if (effectiveProvider === 'gemini') return await callGemini(userContent, apiKey, model);
    throw new AppError('API_ERROR', `Unsupported provider: ${effectiveProvider}`);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError('API_ERROR', `Network or API failure: ${message}`);
  }
}

export interface QuestionWithSuggestions {
  question: string;
  suggestions: [string, string];
}

export async function generateQuestions(
  text: string,
  settings: Settings,
  providerOverride?: Provider,
): Promise<QuestionWithSuggestions[]> {
  const effectiveProvider = providerOverride ?? settings.provider;
  const apiKey = settings.apiKeys[effectiveProvider];
  if (!apiKey) return [];

  const model = settings.model;
  try {
    let raw: string;
    if (effectiveProvider === 'openai') raw = await callOpenAI(text, apiKey, model, QUESTIONS_SYSTEM_PROMPT);
    else if (effectiveProvider === 'anthropic') raw = await callAnthropic(text, apiKey, model, QUESTIONS_SYSTEM_PROMPT);
    else raw = await callGemini(text, apiKey, model, QUESTIONS_SYSTEM_PROMPT);

    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((q): q is Record<string, unknown> => typeof q === 'object' && q !== null)
      .filter(q => typeof q.question === 'string' && Array.isArray(q.suggestions) && q.suggestions.length >= 2)
      .map(q => ({
        question: (q.question as string).trim(),
        suggestions: [
          String((q.suggestions as unknown[])[0]).trim(),
          String((q.suggestions as unknown[])[1]).trim(),
        ] as [string, string],
      }))
      .slice(0, 3);
  } catch {
    return [];
  }
}

async function callOpenAI(text: string, apiKey: string, model: string, systemPrompt = SYSTEM_PROMPT): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });
  if (!response.ok) throw new AppError('API_ERROR', `OpenAI (${response.status}): ${await safeText(response)}`);
  const json = (await response.json()) as unknown;
  return extractOpenAI(json);
}

async function callAnthropic(text: string, apiKey: string, model: string, systemPrompt = SYSTEM_PROMPT): Promise<string> {
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
      system: systemPrompt,
      messages: [{ role: 'user', content: text }],
    }),
  });
  if (!response.ok) throw new AppError('API_ERROR', `Anthropic (${response.status}): ${await safeText(response)}`);
  const json = (await response.json()) as unknown;
  return extractAnthropic(json);
}

async function callGemini(text: string, apiKey: string, model: string, systemPrompt = SYSTEM_PROMPT): Promise<string> {
  const m = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text }] }],
      generationConfig: { temperature: 0.4 },
    }),
  });
  if (!response.ok) throw new AppError('API_ERROR', `Gemini (${response.status}): ${await safeText(response)}`);
  const json = (await response.json()) as unknown;
  return extractGemini(json);
}

function extractOpenAI(json: unknown): string {
  if (!isRec(json)) throw new AppError('INVALID_RESPONSE', 'OpenAI: not an object.');
  const choices = json.choices;
  if (!Array.isArray(choices) || !choices.length) throw new AppError('INVALID_RESPONSE', 'OpenAI: no choices.');
  const msg = (choices[0] as Record<string, unknown>).message;
  if (!isRec(msg) || typeof msg.content !== 'string') throw new AppError('INVALID_RESPONSE', 'OpenAI: bad message.');
  return msg.content.trim();
}

function extractAnthropic(json: unknown): string {
  if (!isRec(json)) throw new AppError('INVALID_RESPONSE', 'Anthropic: not an object.');
  const content = json.content;
  if (!Array.isArray(content) || !content.length) throw new AppError('INVALID_RESPONSE', 'Anthropic: no content.');
  const first = content[0] as Record<string, unknown>;
  if (typeof first.text !== 'string') throw new AppError('INVALID_RESPONSE', 'Anthropic: no text.');
  return first.text.trim();
}

function extractGemini(json: unknown): string {
  if (!isRec(json)) throw new AppError('INVALID_RESPONSE', 'Gemini: not an object.');
  const cands = json.candidates;
  if (!Array.isArray(cands) || !cands.length) throw new AppError('INVALID_RESPONSE', 'Gemini: no candidates.');
  const content = (cands[0] as Record<string, unknown>).content;
  if (!isRec(content)) throw new AppError('INVALID_RESPONSE', 'Gemini: bad content.');
  const parts = content.parts;
  if (!Array.isArray(parts) || !parts.length) throw new AppError('INVALID_RESPONSE', 'Gemini: no parts.');
  const text = (parts[0] as Record<string, unknown>).text;
  if (typeof text !== 'string') throw new AppError('INVALID_RESPONSE', 'Gemini: no text.');
  return text.trim();
}

function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function safeText(r: Response): Promise<string> {
  try { return (await r.text()).slice(0, 300); } catch { return '<unreadable>'; }
}

// Quick Intel v2 — Prompt Enhancer content script.
// Runs on all pages at document_idle (no iframes).
// Shadow DOM isolates all UI from host page styles.

import type { RuntimeResponse } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const HOSTNAME = window.location.hostname;
const MIN_LENGTH = 5;
const VAGUE_CHARS = 60;
const VAGUE_WORDS = 8;
const BOLT = 'M13 2 4 14h6l-1 8 9-12h-6l1-8z';
const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const HOTKEY_LABEL = IS_MAC ? 'Cmd ⇧ Q' : 'Ctrl ⇧ Q';
const HOTKEY_LABEL_SHORT = IS_MAC ? '⌘⇧Q' : 'Ctrl ⇧ Q';

// ── State ─────────────────────────────────────────────────────────────────────

let fieldEl: HTMLTextAreaElement | HTMLInputElement | null = null;
let btnHost: HTMLDivElement | null = null;
let btnShadow: ShadowRoot | null = null;
let modalHost: HTMLDivElement | null = null;
let isEnabled = true;
let pausedUntil = 0;
let disabledDomains: string[] = [];
let enhancing = false;
let focusOutTimer: ReturnType<typeof setTimeout> | null = null;
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

// Drag state for repositioning the bolt button inside the field
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDragging = false;
let dragMoved = false;
let dragStartMouseX = 0;
let dragStartMouseY = 0;
let dragStartBtnLeft = 0;
let dragStartBtnTop = 0;

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['settings', 'enhancer_paused_until']);
    applySettings(result.settings as Record<string, unknown> | undefined);
    pausedUntil = (result.enhancer_paused_until as number | undefined) ?? 0;
  } catch {
    return;
  }

  if (isActive()) attachListeners();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.settings) applySettings(changes.settings.newValue as Record<string, unknown> | undefined);
    if (changes.enhancer_paused_until) pausedUntil = (changes.enhancer_paused_until.newValue as number) ?? 0;
    if (!isActive()) {
      detachListeners();
      removeBtn();
      removeModal();
    } else {
      attachListeners();
    }
  });

  chrome.runtime.onMessage.addListener((msg: { type?: string }) => {
    if (msg.type === 'TRIGGER_ENHANCE') void trigger();
  });
}

function applySettings(settings: Record<string, unknown> | undefined): void {
  const e = settings?.enhancer as { enabled?: boolean; disabledDomains?: string[] } | undefined;
  isEnabled = e?.enabled ?? true;
  disabledDomains = e?.disabledDomains ?? [];
}

// isActive: whether to show the button at all (paused still shows button, dimmed)
function isActive(): boolean {
  return isEnabled && !disabledDomains.includes(HOSTNAME);
}

// isPaused: paused but still active — button shows dimmed, trigger is suppressed
function isPaused(): boolean {
  return Date.now() < pausedUntil;
}

let listenersAttached = false;

function attachListeners(): void {
  if (listenersAttached) return;
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  listenersAttached = true;
}

function detachListeners(): void {
  document.removeEventListener('focusin', onFocusIn);
  document.removeEventListener('focusout', onFocusOut);
  listenersAttached = false;
}

// ── Field detection ───────────────────────────────────────────────────────────

function isSupported(el: Element): el is HTMLTextAreaElement | HTMLInputElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    const t = (el.type ?? '').toLowerCase();
    return !t || t === 'text' || t === 'search' || t === 'email' || t === 'url';
  }
  return false;
}

function isZeroArea(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width === 0 && r.height === 0;
}

// ── Focus handlers ────────────────────────────────────────────────────────────

function onFocusIn(e: FocusEvent): void {
  if (focusOutTimer !== null) { clearTimeout(focusOutTimer); focusOutTimer = null; }
  const t = e.target as Element;
  if (!isSupported(t) || isZeroArea(t)) return;
  fieldEl = t;
  attachBtn(t);
}

function onFocusOut(): void {
  focusOutTimer = setTimeout(() => {
    if (enhancing || modalHost !== null) return;
    if (document.activeElement !== fieldEl) {
      removeBtn();
      fieldEl = null;
    }
  }, 150);
}

// ── Floating button ───────────────────────────────────────────────────────────

function attachBtn(field: HTMLTextAreaElement | HTMLInputElement): void {
  removeBtn();
  // Reset drag offset when attaching to a new field
  dragOffsetX = 0;
  dragOffsetY = 0;

  btnHost = document.createElement('div');
  btnHost.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:32px;height:32px';
  document.body.appendChild(btnHost);

  btnShadow = btnHost.attachShadow({ mode: 'open' });
  btnShadow.innerHTML = buildBtnHTML();

  // pointer-events:none on the wrap so clicks outside the button pass through to the text field.
  // The button, chevron, and menu set pointer-events:auto in CSS.

  // Main button: drag-to-move OR click-to-enhance
  const mainBtn = btnShadow.querySelector<HTMLElement>('.qi-btn')!;
  mainBtn.addEventListener('mousedown', onBtnMouseDown);

  // Chevron: toggle menu and refresh pause state
  const chevron = btnShadow.querySelector<HTMLElement>('.qi-corner-chev')!;
  chevron.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = btnShadow!.querySelector<HTMLElement>('.qi-menu')!;
    const willShow = menu.style.display !== 'block';
    if (willShow) refreshPauseMenuItem();
    menu.style.display = willShow ? 'block' : 'none';
  });

  btnShadow.querySelector<HTMLElement>('[data-action="disable"]')!.addEventListener('click', () => {
    closeMenu(); void disableSite();
  });
  btnShadow.querySelector<HTMLElement>('[data-action="settings"]')!.addEventListener('click', () => {
    closeMenu();
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP', tab: 'settings' }).catch(() => {});
  });
  btnShadow.querySelector<HTMLElement>('[data-action="pause"]')!.addEventListener('click', () => {
    closeMenu();
    void togglePause();
  });
  document.addEventListener('click', closeMenu, { capture: true, passive: true });

  positionBtn(field);
  updatePauseVisual();
  watchField(field);
}

function positionBtn(field: Element): void {
  if (!btnHost) return;
  const r = field.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) { btnHost.style.visibility = 'hidden'; return; }
  btnHost.style.visibility = '';
  const PAD = 8;
  const left = Math.max(PAD, Math.min(window.innerWidth  - 36, r.right  - 16 + dragOffsetX));
  const top  = Math.max(PAD, Math.min(window.innerHeight - 36, r.bottom - 16 + dragOffsetY));
  btnHost.style.left = `${left}px`;
  btnHost.style.top  = `${top}px`;
}

function watchField(field: Element): void {
  const ro = new ResizeObserver(() => { if (fieldEl) positionBtn(fieldEl); });
  ro.observe(field);
  const reposition = (): void => { if (fieldEl) positionBtn(fieldEl); };
  window.addEventListener('scroll', reposition, { passive: true });
  window.addEventListener('resize', reposition, { passive: true });
}

function removeBtn(): void {
  document.removeEventListener('click', closeMenu, { capture: true });
  document.removeEventListener('mousemove', onBtnMouseMove);
  document.removeEventListener('mouseup', onBtnMouseUp);
  btnHost?.remove();
  btnHost = null;
  btnShadow = null;
}

function closeMenu(): void {
  const menu = btnShadow?.querySelector<HTMLElement>('.qi-menu');
  if (menu) menu.style.display = 'none';
}

// ── Drag handlers ─────────────────────────────────────────────────────────────

function onBtnMouseDown(e: MouseEvent): void {
  e.stopPropagation();
  dragStartMouseX = e.clientX;
  dragStartMouseY = e.clientY;
  dragStartBtnLeft = parseFloat(btnHost!.style.left);
  dragStartBtnTop  = parseFloat(btnHost!.style.top);
  isDragging = true;
  dragMoved  = false;
  document.addEventListener('mousemove', onBtnMouseMove);
  document.addEventListener('mouseup',   onBtnMouseUp);
}

function onBtnMouseMove(e: MouseEvent): void {
  if (!isDragging || !fieldEl || !btnHost) return;
  const dx = e.clientX - dragStartMouseX;
  const dy = e.clientY - dragStartMouseY;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
  if (!dragMoved) return;

  const r = fieldEl.getBoundingClientRect();
  const newLeft = Math.max(r.left + 4, Math.min(r.right  - 4, dragStartBtnLeft + dx));
  const newTop  = Math.max(r.top  + 4, Math.min(r.bottom - 4, dragStartBtnTop  + dy));
  btnHost.style.left = `${newLeft}px`;
  btnHost.style.top  = `${newTop}px`;

  // Update offset so positionBtn respects user's chosen position on scroll/resize
  dragOffsetX = newLeft - (r.right  - 16);
  dragOffsetY = newTop  - (r.bottom - 16);

  if (btnShadow) {
    const btn = btnShadow.querySelector<HTMLElement>('.qi-btn');
    if (btn) btn.style.cursor = 'grabbing';
  }
}

function onBtnMouseUp(): void {
  document.removeEventListener('mousemove', onBtnMouseMove);
  document.removeEventListener('mouseup',   onBtnMouseUp);
  if (btnShadow) {
    const btn = btnShadow.querySelector<HTMLElement>('.qi-btn');
    if (btn) btn.style.cursor = 'grab';
  }
  const wasClick = !dragMoved;
  isDragging = false;
  dragMoved  = false;
  if (wasClick) void trigger();
}

// ── Pause helpers ─────────────────────────────────────────────────────────────

async function togglePause(): Promise<void> {
  if (isPaused()) {
    // Resume: clear the pause
    pausedUntil = 0;
    await chrome.storage.local.set({ enhancer_paused_until: 0 });
    updatePauseVisual();
  } else {
    // Pause for 1 hour
    pausedUntil = Date.now() + 3_600_000;
    await chrome.storage.local.set({ enhancer_paused_until: pausedUntil });
    updatePauseVisual();
  }
}

function updatePauseVisual(): void {
  if (!btnShadow) return;
  const btn = btnShadow.querySelector<HTMLElement>('.qi-btn')!;
  const paused = isPaused();
  btn.style.opacity = paused ? '0.45' : '';
  btn.title = paused ? 'Quick Intel paused. Click to resume.' : '';
}

function refreshPauseMenuItem(): void {
  const item = btnShadow?.querySelector<HTMLElement>('[data-action="pause"]');
  if (!item) return;
  const paused = isPaused();
  const minLeft = paused ? Math.max(0, Math.ceil((pausedUntil - Date.now()) / 60_000)) : 0;
  item.innerHTML = paused
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
       Resume${minLeft > 0 ? ` (${minLeft}m left)` : ''}`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
       Pause for 1 hour`;
}

function setLoading(loading: boolean): void {
  if (!btnShadow) return;
  const icon    = btnShadow.querySelector<HTMLElement>('.qi-icon')!;
  const spinner = btnShadow.querySelector<HTMLElement>('.qi-spinner')!;
  icon.hidden    = loading;
  spinner.hidden = !loading;
  btnShadow.querySelector<HTMLButtonElement>('.qi-btn')!.disabled = loading;
}

function buildBtnHTML(): string {
  return `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; }
  /* btnHost is positioned so its top-left IS the button's top-left.
     Wrap fills the host; no absolute offset tricks. */
  .qi-wrap {
    position: relative;
    width: 32px; height: 32px;
    pointer-events: none;
  }
  .qi-btn {
    width: 32px; height: 32px; padding: 0; border: none;
    cursor: grab; pointer-events: auto;
    background: linear-gradient(135deg, #5b5ef4, #8b5cf6);
    border-radius: 10px;
    display: grid; place-items: center;
    box-shadow:
      0 8px 24px -6px rgba(91,94,244,.65),
      0 0 0 1px rgba(91,94,244,.5),
      inset 0 1px 0 rgba(255,255,255,.25);
    transition: transform .15s ease;
    position: relative;
  }
  .qi-btn:hover:not(:disabled) { transform: scale(1.05); }
  .qi-btn:disabled { opacity: .7; cursor: not-allowed; }
  .qi-icon svg { width: 15px; height: 15px; fill: white; display: block; }
  .qi-spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,.3); border-top-color: white;
    border-radius: 50%; animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Corner chevron */
  .qi-corner-chev {
    position: absolute; right: -3px; bottom: -3px;
    width: 14px; height: 14px;
    background: #060b18; border-radius: 4px;
    display: grid; place-items: center;
    border: 1px solid #5b5ef4;
    box-shadow: 0 2px 6px rgba(0,0,0,.4);
    cursor: pointer; pointer-events: auto;
    opacity: 0;
    transition: opacity .15s;
    z-index: 1;
  }
  .qi-wrap:hover .qi-corner-chev { opacity: 1; }
  .qi-corner-chev svg { width: 8px; height: 8px; color: #fff; display: block; }

  /* Tooltip */
  .qi-tooltip {
    position: absolute;
    bottom: calc(100% + 10px); right: 0;
    background: #060b18; border: 1px solid #1e3050; color: #f0f4ff;
    font: 500 12px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    padding: 8px 11px; border-radius: 8px;
    display: inline-flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 22px -6px rgba(0,0,0,.5);
    pointer-events: none; opacity: 0;
    transition: opacity .1s; transition-delay: 0s;
    white-space: nowrap;
  }
  .qi-wrap:hover .qi-tooltip { opacity: 1; transition-delay: .5s; }
  .qi-tooltip::after {
    content: "";
    position: absolute;
    bottom: -5px; right: 14px;
    width: 8px; height: 8px;
    background: #060b18;
    border-right: 1px solid #1e3050; border-bottom: 1px solid #1e3050;
    transform: rotate(45deg);
  }
  .qi-kbd {
    font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 10.5px; color: #6b85a8;
    background: #0d1628; padding: 2px 5px;
    border-radius: 4px; border: 1px solid #1e3050;
  }

  /* Menu */
  .qi-menu {
    display: none; pointer-events: auto;
    position: absolute; bottom: calc(100% + 8px); right: 0;
    background: linear-gradient(180deg, rgba(21,32,53,.98), rgba(13,22,40,.98));
    backdrop-filter: blur(12px);
    border: 1px solid #1e3050; border-radius: 12px;
    padding: 5px; min-width: 190px;
    box-shadow: 0 12px 32px -8px rgba(0,0,0,.6), 0 0 0 1px rgba(91,94,244,.1);
    z-index: 10;
  }
  .qi-menu-item {
    width: 100%; text-align: left;
    background: transparent; border: none;
    color: #f0f4ff;
    font: 500 12.5px/1.3 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    padding: 8px 10px; border-radius: 7px;
    cursor: pointer;
    display: flex; align-items: center; gap: 9px;
    transition: background .12s ease;
  }
  .qi-menu-item:hover { background: rgba(91,94,244,.14); }
  .qi-menu-item svg { width: 13px; height: 13px; color: #6b85a8; flex-shrink: 0; }
  .qi-menu-item.danger { color: #ff8b8b; }
  .qi-menu-item.danger svg { color: #ff8b8b; }
  .qi-menu-sep { border: none; border-top: 1px solid #1e3050; margin: 4px 0; }
  .qi-kbd-end {
    margin-left: auto;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 10px; color: #4a5f80;
  }
</style>
<div class="qi-wrap">
  <button class="qi-btn" aria-label="Enhance with Quick Intel (${HOTKEY_LABEL})">
    <span class="qi-icon"><svg viewBox="0 0 24 24"><path d="${BOLT}"/></svg></span>
    <span class="qi-spinner" hidden></span>
  </button>
  <div class="qi-corner-chev" role="button" tabindex="0" aria-label="Options">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </div>
  <div class="qi-tooltip">
    Enhance with Quick Intel
    <span class="qi-kbd">${HOTKEY_LABEL_SHORT}</span>
  </div>
  <div class="qi-menu">
    <button class="qi-menu-item" data-action="disable">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
      Disable on this site
    </button>
    <button class="qi-menu-item" data-action="settings">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      Open settings
    </button>
    <hr class="qi-menu-sep"/>
    <button class="qi-menu-item" data-action="pause">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Pause for 1 hour
    </button>
  </div>
</div>`;
}

// ── Error helpers ─────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = { openai: 'GPT-4o (OpenAI)', anthropic: 'Claude (Anthropic)', gemini: 'Gemini' };

function cleanError(raw: string): string {
  const s = raw.toLowerCase();
  // Specific "no API key" message with provider name
  if (s.includes('no api key configured for')) {
    const m = raw.match(/configured for (\w+)/i);
    const label = m ? (PROVIDER_LABELS[m[1].toLowerCase()] ?? m[1]) : 'the selected provider';
    return `No API key for ${label}. Open Quick Intel settings to add one or switch to a configured provider.`;
  }
  if (raw.includes('429') || s.includes('quota') || s.includes('rate limit') || s.includes('resource_exhausted')) {
    return "Rate limit reached. You've hit your API quota. Check your plan and try again.";
  }
  if (raw.includes('401') || s.includes('invalid api key') || s.includes('unauthorized')) {
    return 'Invalid API key. Verify your key in Quick Intel settings.';
  }
  if (raw.includes('403')) {
    return "Access denied. Your API key doesn't have permission for this operation.";
  }
  if (raw.includes('500') || raw.includes('502') || raw.includes('503')) {
    return 'The AI provider is experiencing issues. Try again in a moment.';
  }
  if (s.includes('network') || s.includes('failed to fetch')) {
    return 'Network error. Check your internet connection and try again.';
  }
  // Strip JSON blobs; keep only the prefix before any `{`
  const jsonIdx = raw.indexOf('{');
  if (jsonIdx > 0) {
    const prefix = raw.slice(0, jsonIdx).trim().replace(/:$/, '').trim();
    if (prefix.length > 10) return prefix;
  }
  return raw.length > 160 ? raw.slice(0, 160).trimEnd() + '…' : raw;
}

// ── Disable site ──────────────────────────────────────────────────────────────

async function disableSite(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: 'DISABLE_SITE', domain: HOSTNAME });
  } catch { /* storage.onChanged will still fire */ }
  removeBtn();
  removeModal();
}

// ── Trigger enhance ───────────────────────────────────────────────────────────

function isVague(text: string): boolean {
  return text.length < VAGUE_CHARS || text.trim().split(/\s+/).length < VAGUE_WORDS;
}

async function trigger(): Promise<void> {
  if (!fieldEl || enhancing) return;
  if (isPaused()) return;

  const text = fieldEl.value.trim();
  if (text.length < MIN_LENGTH) return;

  enhancing = true;
  setLoading(true);

  try {
    if (isVague(text)) {
      const raw = await chrome.runtime.sendMessage({ type: 'GENERATE_QUESTIONS', text }) as RuntimeResponse<{ questions: Array<{ question: string; suggestions: [string, string] }> }>;
      if (raw.ok && raw.data.questions.length > 0) {
        enhancing = false;
        setLoading(false);
        showQuestionnaireModal(text, raw.data.questions);
        return;
      }
    }
    await doEnhance(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showModal(text, null, cleanError(msg));
    enhancing = false;
    setLoading(false);
  }
}

async function doEnhance(text: string, answers?: string[]): Promise<void> {
  enhancing = true;
  setLoading(true);
  try {
    const raw = await chrome.runtime.sendMessage({
      type: 'ENHANCE_PROMPT',
      text,
      ...(answers?.length ? { answers } : {}),
    }) as RuntimeResponse<{ enhanced: string }>;

    if (raw.ok) showModal(text, raw.data.enhanced, null);
    else showModal(text, null, cleanError(raw.error.message));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showModal(text, null, cleanError(msg));
  } finally {
    enhancing = false;
    setLoading(false);
  }
}

// ── Modal positioning ─────────────────────────────────────────────────────────

// Places the modal anchored to the Quick Intel button, growing upward from button corner.
function placeModal(modal: HTMLElement, estimatedH: number): void {
  const MODAL_W = 412;
  const GAP = 8;   // px gap between button and modal
  const PAD = 10;  // min distance from viewport edge
  const BTN = 32;

  // btnHost.left/top is the button's actual top-left position.
  let btnLeft: number, btnTopPos: number;
  if (btnHost?.style.left) {
    btnLeft   = parseFloat(btnHost.style.left);
    btnTopPos = parseFloat(btnHost.style.top);
  } else if (fieldEl) {
    const r = fieldEl.getBoundingClientRect();
    btnLeft   = r.right  - 16;
    btnTopPos = r.bottom - 16;
  } else {
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%,-50%)';
    modal.style.pointerEvents = 'auto';
    return;
  }

  const btnRight  = btnLeft + BTN;
  const btnBottom = btnTopPos + BTN;
  const btnTop    = btnTopPos;

  // Right-align modal to button's right edge
  let left = btnRight - MODAL_W;
  left = Math.max(PAD, Math.min(left, window.innerWidth - MODAL_W - PAD));

  const spaceAbove = btnTop - PAD;
  const spaceBelow = window.innerHeight - btnBottom - PAD;
  const clampedH   = Math.min(estimatedH, Math.max(spaceAbove, spaceBelow, 200));

  let top: number;
  let origin: string;

  if (spaceAbove >= Math.min(clampedH, 200)) {
    top = btnTop - clampedH - GAP;
    top = Math.max(PAD, top);
    origin = 'bottom right';
  } else {
    top = btnBottom + GAP;
    top = Math.min(top, window.innerHeight - clampedH - PAD);
    origin = 'top right';
  }

  modal.style.top = `${top}px`;
  modal.style.left = `${left}px`;
  modal.style.pointerEvents = 'auto';
  modal.style.transformOrigin = origin;
}

// ── Questionnaire modal ───────────────────────────────────────────────────────

function showQuestionnaireModal(text: string, questions: Array<{ question: string; suggestions: [string, string] }>): void {
  removeModal();

  modalHost = document.createElement('div');
  modalHost.style.cssText = 'position:fixed;z-index:2147483647;inset:0;pointer-events:none';
  document.body.appendChild(modalHost);

  const shadow = modalHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = buildQuestionnaireHTML(questions);

  const modal = shadow.querySelector<HTMLElement>('.qi-modal')!;
  const estimatedH = 130 + questions.length * 120;
  placeModal(modal, estimatedH);

  shadow.querySelector('.qi-close')!.addEventListener('click', removeModal);

  // Drag on header
  const qHeader = shadow.querySelector<HTMLElement>('.qi-header')!;
  let qDrag = { on: false, sx: 0, sy: 0, sl: 0, st: 0 };
  const onQMove = (e: MouseEvent): void => {
    if (!qDrag.on) return;
    const w = modal.offsetWidth, h = modal.offsetHeight;
    modal.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, qDrag.sl + e.clientX - qDrag.sx))}px`;
    modal.style.top  = `${Math.max(8, Math.min(window.innerHeight - h - 8, qDrag.st + e.clientY - qDrag.sy))}px`;
  };
  const onQUp = (): void => {
    qDrag.on = false;
    qHeader.classList.remove('qi-dragging');
    document.removeEventListener('mousemove', onQMove);
    document.removeEventListener('mouseup', onQUp);
  };
  qHeader.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as Element).closest('.qi-close')) return;
    qDrag = { on: true, sx: e.clientX, sy: e.clientY, sl: parseInt(modal.style.left) || 0, st: parseInt(modal.style.top) || 0 };
    qHeader.classList.add('qi-dragging');
    document.addEventListener('mousemove', onQMove);
    document.addEventListener('mouseup', onQUp);
    e.preventDefault();
  });

  shadow.querySelector('.qi-skip')!.addEventListener('click', () => {
    removeModal();
    void doEnhance(text);
  });

  // Toggle "Other" text input visibility when the Other radio is selected
  questions.forEach((_, i) => {
    shadow.querySelectorAll<HTMLInputElement>(`input[name="qi-q-${i}"]`).forEach((radio) => {
      radio.addEventListener('change', () => {
        const otherInput = shadow.querySelector<HTMLInputElement>(`#qi-q-${i}-other`);
        if (!otherInput) return;
        if (radio.value === '__other__' && radio.checked) {
          otherInput.classList.add('qi-visible');
          otherInput.focus();
        } else {
          otherInput.classList.remove('qi-visible');
        }
      });
    });
  });

  shadow.querySelector('.qi-submit')!.addEventListener('click', () => {
    const answers: string[] = [];
    questions.forEach((_, i) => {
      const selected = shadow.querySelector<HTMLInputElement>(`input[name="qi-q-${i}"]:checked`);
      if (!selected) return;
      if (selected.value === '__other__') {
        const val = shadow.querySelector<HTMLInputElement>(`#qi-q-${i}-other`)?.value.trim() ?? '';
        if (val) answers.push(val);
      } else {
        answers.push(selected.value);
      }
    });
    removeModal();
    void doEnhance(text, answers.length ? answers : undefined);
  });

  // Allow Enter in "Other" text inputs to submit
  shadow.querySelectorAll<HTMLInputElement>('.qi-q-input').forEach((inp) => {
    inp.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') shadow.querySelector<HTMLButtonElement>('.qi-submit')!.click();
    });
  });

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') { removeModal(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);

  // Focus first radio
  setTimeout(() => shadow.querySelector<HTMLInputElement>('input[type="radio"]')?.focus(), 50);
}

function buildQuestionnaireHTML(questions: Array<{ question: string; suggestions: [string, string] }>): string {
  const esc = (s: string): string => s.replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const rows = questions.map((q, i) => `
    <div class="qi-q-row">
      <label class="qi-q-label">${esc(q.question)}</label>
      <div class="qi-options">
        <label class="qi-radio-label">
          <input type="radio" name="qi-q-${i}" value="${esc(q.suggestions[0])}" />
          <span class="qi-radio-text">${esc(q.suggestions[0])}</span>
        </label>
        <label class="qi-radio-label">
          <input type="radio" name="qi-q-${i}" value="${esc(q.suggestions[1])}" />
          <span class="qi-radio-text">${esc(q.suggestions[1])}</span>
        </label>
        <label class="qi-radio-label">
          <input type="radio" name="qi-q-${i}" value="__other__" />
          <span class="qi-radio-text">Other</span>
        </label>
        <input id="qi-q-${i}-other" class="qi-q-input" type="text" placeholder="Your answer…" autocomplete="off" spellcheck="false" />
      </div>
    </div>`).join('');

  return `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes qi-modal-in {
    from { opacity: 0; transform: scale(0.92) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .qi-modal {
    position: fixed; width: 412px;
    max-height: min(80vh, 540px);
    background: linear-gradient(180deg, rgba(21,32,53,.96), rgba(13,22,40,.96));
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border: 1px solid #1e3050;
    border-radius: 16px; overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(91,94,244,.15),
      0 30px 60px -20px rgba(0,0,0,.7),
      0 0 80px -20px rgba(91,94,244,.3);
    display: flex; flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
    animation: qi-modal-in .35s cubic-bezier(.22,1.2,.36,1) both;
    transform-origin: bottom right;
  }
  .qi-modal::before {
    content: "";
    position: absolute; inset: 0;
    border-radius: 16px; padding: 1px;
    background: linear-gradient(135deg, rgba(91,94,244,.4), rgba(139,92,246,.15) 50%, transparent 80%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    pointer-events: none;
  }
  .qi-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid #1e3050; flex-shrink: 0;
    position: relative; z-index: 1;
    cursor: grab; user-select: none;
  }
  .qi-header.qi-dragging { cursor: grabbing; }
  .qi-title {
    display: flex; align-items: center; gap: 9px;
    font-size: 14px; font-weight: 600; color: #f0f4ff;
  }
  .qi-bolt {
    width: 22px; height: 22px; border-radius: 6px;
    background: linear-gradient(135deg, #5b5ef4, #8b5cf6);
    display: grid; place-items: center;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.25);
    flex-shrink: 0;
  }
  .qi-bolt svg { width: 12px; height: 12px; fill: #fff; display: block; }
  .qi-close {
    width: 24px; height: 24px; border-radius: 7px;
    background: transparent; border: 1px solid transparent;
    color: #6b85a8; cursor: pointer;
    display: grid; place-items: center; transition: all .15s ease;
  }
  .qi-close:hover { background: rgba(255,255,255,.05); color: #f0f4ff; border-color: #1e3050; }
  .qi-close svg { width: 13px; height: 13px; display: block; }
  .qi-body { flex: 1; overflow-y: auto; padding: 14px 16px 4px; position: relative; z-index: 1; }
  .qi-body::-webkit-scrollbar { width: 4px; }
  .qi-body::-webkit-scrollbar-thumb { background: #2a4570; border-radius: 2px; }
  .qi-hint {
    font-size: 12px; color: #6b85a8; line-height: 1.55; margin-bottom: 14px;
  }
  .qi-q-row { margin-bottom: 14px; }
  .qi-q-label {
    display: block; font-size: 12px; font-weight: 600; color: #f0f4ff;
    letter-spacing: -.005em; margin-bottom: 8px;
  }
  .qi-options { display: flex; flex-direction: column; gap: 5px; }
  .qi-radio-label {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 10px; border-radius: 8px; cursor: pointer;
    border: 1px solid #1e3050; background: transparent;
    font-size: 12.5px; color: #94a3b8; transition: all .15s ease; user-select: none;
  }
  .qi-radio-label:hover { border-color: rgba(91,94,244,.4); background: rgba(91,94,244,.06); color: #f0f4ff; }
  .qi-radio-label:has(input:checked) { border-color: rgba(91,94,244,.6); background: rgba(91,94,244,.12); color: #f0f4ff; }
  input[type="radio"] { accent-color: #5b5ef4; width: 14px; height: 14px; flex-shrink: 0; cursor: pointer; }
  .qi-radio-text { line-height: 1.3; }
  .qi-q-input {
    display: none; width: 100%; height: 36px; margin-top: 4px;
    background: linear-gradient(180deg, rgba(13,22,40,.85), rgba(6,11,24,.85));
    border: 1px solid #1e3050; border-radius: 8px;
    color: #f0f4ff; padding: 0 12px;
    font: 500 12.5px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    outline: none; transition: all .15s ease;
  }
  .qi-q-input.qi-visible { display: block; }
  .qi-q-input::placeholder { color: #4a5f80; }
  .qi-q-input:focus { border-color: rgba(91,94,244,.6); box-shadow: 0 0 0 3px rgba(91,94,244,.15); }
  .qi-footer {
    display: flex; gap: 8px; padding: 12px 16px 16px;
    border-top: 1px solid #1e3050; flex-shrink: 0;
    position: relative; z-index: 1;
  }
  .qi-skip {
    flex: 1; height: 38px; background: transparent; border: 1px solid #1e3050;
    border-radius: 9px; color: #6b85a8;
    font: 600 12.5px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    cursor: pointer; transition: all .15s ease;
  }
  .qi-skip:hover { color: #f0f4ff; border-color: #2a4570; background: rgba(255,255,255,.02); }
  .qi-submit {
    flex: 1.3; height: 38px; border: none; border-radius: 9px;
    background: linear-gradient(135deg, #5b5ef4, #8b5cf6);
    color: #fff;
    font: 600 12.5px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 4px 14px -4px rgba(91,94,244,.5), 0 0 0 1px rgba(91,94,244,.4);
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    transition: box-shadow .15s ease;
  }
  .qi-submit:hover { box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 6px 22px -4px rgba(91,94,244,.7); }
  .qi-submit svg { width: 13px; height: 13px; display: block; }
</style>
<div class="qi-modal">
  <div class="qi-header">
    <div class="qi-title">
      <div class="qi-bolt"><svg viewBox="0 0 24 24"><path d="${BOLT}"/></svg></div>
      Quick Intel: Before we enhance
    </div>
    <button class="qi-close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div class="qi-body">
    <p class="qi-hint">Answer a few questions for a sharper result, or skip and enhance directly.</p>
    ${rows}
  </div>
  <div class="qi-footer">
    <button class="qi-skip">Skip</button>
    <button class="qi-submit">
      Use answers
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </button>
  </div>
</div>`;
}

// ── Diff modal ────────────────────────────────────────────────────────────────

function showModal(original: string, enhanced: string | null, error: string | null): void {
  removeModal();

  modalHost = document.createElement('div');
  modalHost.style.cssText = 'position:fixed;z-index:2147483647;inset:0;pointer-events:none';
  document.body.appendChild(modalHost);

  const shadow = modalHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = buildModalHTML(original, enhanced, error);

  const modal = shadow.querySelector<HTMLElement>('.qi-modal')!;
  placeModal(modal, enhanced ? 420 : 240);

  shadow.querySelector('.qi-close')!.addEventListener('click', removeModal);
  shadow.querySelector('.qi-reject')?.addEventListener('click', removeModal);

  // Copy buttons
  shadow.querySelectorAll<HTMLButtonElement>('.qi-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.dataset.copy === 'orig'
        ? shadow.querySelector<HTMLElement>('[data-qi-orig]')?.textContent ?? ''
        : shadow.querySelector<HTMLElement>('[data-qi-enhanced]')?.textContent ?? '';
      void navigator.clipboard.writeText(src).then(() => {
        btn.classList.add('qi-copied');
        setTimeout(() => btn.classList.remove('qi-copied'), 1500);
      });
    });
  });

  shadow.querySelector('.qi-retry')?.addEventListener('click', () => {
    removeModal();
    void trigger();
  });

  // Auto-dismiss error modals after 5 seconds
  if (error) {
    autoDismissTimer = setTimeout(removeModal, 5000);
  }
  shadow.querySelector('.qi-accept')?.addEventListener('click', () => {
    if (enhanced && fieldEl) applyText(fieldEl, enhanced);
    removeModal();
  });

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') { removeModal(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

function removeModal(): void {
  if (autoDismissTimer !== null) { clearTimeout(autoDismissTimer); autoDismissTimer = null; }
  modalHost?.remove();
  modalHost = null;
}

function applyText(field: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  const proto = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(field, value);
  else field.value = value;

  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  field.focus();
}

function buildModalHTML(original: string, enhanced: string | null, error: string | null): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const copyBtn = (label: string) =>
    `<button class="qi-copy" data-copy="${label}" aria-label="Copy">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>` +
    `<span class="qi-copy-tick" aria-hidden="true">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></button>`;

  const body = error
    ? `<div class="qi-diff-label">Error</div>
       <div class="qi-error">${esc(error)}</div>`
    : `<div class="qi-diff-row"><span class="qi-diff-label">Original</span>${copyBtn('orig')}</div>
       <div class="qi-diff-card" data-qi-orig>${esc(original)}</div>
       <div class="qi-diff-row"><span class="qi-diff-label">Enhanced</span>${copyBtn('enhanced')}</div>
       <div class="qi-diff-card enhanced" data-qi-enhanced>${esc(enhanced ?? '')}</div>`;

  const footer = error
    ? `<button class="qi-retry">Try again</button>`
    : `<button class="qi-reject">Reject</button>
       <button class="qi-accept">
         Use this
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
       </button>`;

  return `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes qi-modal-in {
    from { opacity: 0; transform: scale(0.92) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .qi-modal {
    position: fixed; width: 412px; max-height: 520px;
    background: linear-gradient(180deg, rgba(21,32,53,.96), rgba(13,22,40,.96));
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border: 1px solid #1e3050; border-radius: 16px; overflow: hidden;
    box-shadow:
      0 0 0 1px rgba(91,94,244,.15),
      0 30px 60px -20px rgba(0,0,0,.7),
      0 0 80px -20px rgba(91,94,244,.3);
    display: flex; flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
    animation: qi-modal-in .35s cubic-bezier(.22,1.2,.36,1) both;
    transform-origin: bottom right;
  }
  .qi-modal::before {
    content: "";
    position: absolute; inset: 0;
    border-radius: 16px; padding: 1px;
    background: linear-gradient(135deg, rgba(91,94,244,.4), rgba(139,92,246,.15) 50%, transparent 80%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    pointer-events: none; z-index: 0;
  }
  .qi-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid #1e3050; flex-shrink: 0;
    position: relative; z-index: 1;
  }
  .qi-title {
    display: flex; align-items: center; gap: 9px;
    font-size: 14px; font-weight: 600; color: #f0f4ff;
  }
  .qi-bolt {
    width: 22px; height: 22px; border-radius: 6px;
    background: linear-gradient(135deg, #5b5ef4, #8b5cf6);
    display: grid; place-items: center;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.25);
    flex-shrink: 0;
  }
  .qi-bolt svg { width: 12px; height: 12px; fill: #fff; display: block; }
  .qi-close {
    width: 24px; height: 24px; border-radius: 7px;
    background: transparent; border: 1px solid transparent;
    color: #6b85a8; cursor: pointer;
    display: grid; place-items: center; transition: all .15s ease;
  }
  .qi-close:hover { background: rgba(255,255,255,.05); color: #f0f4ff; border-color: #1e3050; }
  .qi-close svg { width: 13px; height: 13px; display: block; }
  .qi-body {
    flex: 1; overflow-y: auto; padding: 14px 16px 0;
    display: flex; flex-direction: column;
    position: relative; z-index: 1;
  }
  .qi-body::-webkit-scrollbar { width: 4px; }
  .qi-body::-webkit-scrollbar-thumb { background: #2a4570; border-radius: 2px; }
  .qi-diff-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px;
  }
  .qi-diff-label {
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 10px; font-weight: 600;
    letter-spacing: .14em; text-transform: uppercase;
    color: #6b85a8;
  }
  .qi-copy {
    width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
    background: transparent; border: 1px solid transparent;
    color: #6b85a8; cursor: pointer;
    display: grid; place-items: center; transition: all .15s ease; position: relative;
  }
  .qi-copy:hover { background: rgba(255,255,255,.05); color: #f0f4ff; border-color: #1e3050; }
  .qi-copy svg { width: 12px; height: 12px; display: block; transition: opacity .15s; }
  .qi-copy-tick { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0; color: #34d399; transition: opacity .15s; }
  .qi-copy-tick svg { width: 12px; height: 12px; display: block; }
  .qi-copy.qi-copied { color: #34d399; border-color: #064e3b; }
  .qi-copy.qi-copied > svg:first-of-type { opacity: 0; }
  .qi-copy.qi-copied .qi-copy-tick { opacity: 1; }
  .qi-diff-card {
    background: rgba(6,11,24,.7); border: 1px solid #1e3050;
    border-radius: 10px; padding: 10px 12px;
    font: 500 12.5px/1.55 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    color: #6b85a8; margin-bottom: 12px; word-break: break-word;
  }
  .qi-diff-card.enhanced {
    border-left: 3px solid #5b5ef4; color: #f0f4ff;
    background: linear-gradient(180deg, rgba(91,94,244,.10), rgba(91,94,244,.04));
    max-height: 180px; overflow-y: auto;
    white-space: pre-wrap;
  }
  .qi-diff-card.enhanced::-webkit-scrollbar { width: 4px; }
  .qi-diff-card.enhanced::-webkit-scrollbar-thumb { background: #2a4570; border-radius: 2px; }
  .qi-error {
    background: rgba(127,29,29,.3); border: 1px solid rgba(239,68,68,.3);
    border-radius: 10px; padding: 10px 12px;
    font-size: 12.5px; color: #fca5a5; line-height: 1.5;
    margin-bottom: 12px;
  }
  .qi-footer {
    display: flex; gap: 8px; padding: 4px 16px 16px;
    position: relative; z-index: 1;
  }
  .qi-reject, .qi-retry {
    flex: 1; height: 38px; background: transparent; border: 1px solid #1e3050;
    border-radius: 9px; color: #6b85a8;
    font: 600 12.5px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    cursor: pointer; transition: all .15s ease;
  }
  .qi-reject:hover, .qi-retry:hover { color: #f0f4ff; border-color: #2a4570; background: rgba(255,255,255,.02); }
  .qi-accept {
    flex: 1.3; height: 38px; border: none; border-radius: 9px;
    background: linear-gradient(135deg, #5b5ef4, #8b5cf6);
    color: #fff;
    font: 600 12.5px/1 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 4px 14px -4px rgba(91,94,244,.5), 0 0 0 1px rgba(91,94,244,.4);
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    transition: box-shadow .15s ease;
  }
  .qi-accept:hover { box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 6px 22px -4px rgba(91,94,244,.7); }
  .qi-accept svg { width: 13px; height: 13px; display: block; }
</style>
<div class="qi-modal">
  <div class="qi-header">
    <div class="qi-title">
      <div class="qi-bolt"><svg viewBox="0 0 24 24"><path d="${BOLT}"/></svg></div>
      Quick Intel: Enhance Prompt
    </div>
    <button class="qi-close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div class="qi-body">
    ${body}
  </div>
  <div class="qi-footer">
    ${footer}
  </div>
</div>`;
}

// ── Run ───────────────────────────────────────────────────────────────────────

init().catch(() => {});

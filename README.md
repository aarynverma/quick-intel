# Quick Intel

<p align="center">
  <strong>AI-powered page summarizer for Chrome.</strong><br/>
  Get the gist of any article in seconds.
</p>

<p align="center">
  <em>Manifest V3 · React 18 · TypeScript · Tailwind v4 · Vite</em>
</p>

---

## Features

- **Three summary styles** — TL;DR, bullet points, or a detailed multi-paragraph breakdown
- **Local history** — up to 50 past summaries stored via `chrome.storage.local`
- **One-click copy** — with "Copied!" feedback
- **Privacy-first** — your API key never leaves your browser; calls go directly to OpenAI, Anthropic, or Google
- **Free tier available** — Google Gemini's free tier (15 req/min, no credit card) is a zero-cost starting point
- **Minimum-privilege manifest** — `activeTab` only, plus scoped host permissions for the three API endpoints

## Screenshots

> *(Describe what the store screenshots would show — replace with real PNGs before submission.)*

1. **Main view** — header with the Quick Intel bolt mark, summary-style dropdown, primary "Summarize this page" button, and a clean card with the generated summary.
2. **History tab** — list of past summaries, each showing title, source URL, style badge, and relative timestamp. Hover reveals a delete button.
3. **Settings** — provider toggle (OpenAI / Anthropic / Gemini), model input, and a password-style API key field with "Show" / "Hide" toggle and a "Key saved" indicator.
4. **Error state** — rose-colored banner with a clear title, specific message, and a hint on how to recover.

## Setup

### 1. Install

```bash
cd quick-intel
npm install
```

### 2. Build

```bash
npm run build
```

This will:
1. Generate icon PNGs (16/32/48/128) from the SVG source
2. Type-check with `tsc`
3. Bundle with Vite + CRXJS into `dist/`

For watch-mode development:

```bash
npm run dev
```

### 3. Load in Chrome

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Pin the Quick Intel icon to your toolbar for quick access

### 4. Add your API key

1. Click the Quick Intel icon
2. Go to the **Settings** tab
3. Pick a provider (OpenAI, Anthropic, or Gemini)
4. Paste your API key → **Save settings**

**Where to get a key:**
- **Google Gemini (free)** → https://aistudio.google.com/apikey — free tier, 15 req/min, no credit card required
- OpenAI → https://platform.openai.com/api-keys
- Anthropic → https://console.anthropic.com/settings/keys

### 5. Use it

Navigate to any article → click the Quick Intel icon → pick a style → **Summarize this page**. The result is copyable and auto-saved to your history.

## Environment Variables (optional)

For developer convenience only. Copy `.env.example` to `.env.local`:

```bash
VITE_DEFAULT_PROVIDER=openai
VITE_DEFAULT_MODEL=gpt-4o-mini
```

**Never bake a real API key into the build.** These defaults only control the Settings panel's initial values; the real key is always user-entered and stored in `chrome.storage.local`.

## Architecture

### Security model
- The **popup never sees the API key**. It only queries `GET_PUBLIC_SETTINGS`, which returns a redacted `{ hasApiKey: boolean, model, provider }`.
- All LLM calls happen in the **service worker**. The key is read from `chrome.storage.local`, used in a `fetch`, and never returned to the popup.
- The manifest's `host_permissions` is scoped to the three API endpoints only. Page content is accessed via `activeTab` + `chrome.scripting.executeScript` — no broad `<all_urls>` grant.
- A strict **Content Security Policy** restricts `connect-src` to the three API hosts.

### Service worker lifecycle (MV3)
Service workers are event-driven. They spin up on an event (message, install), run the handler, and are terminated when idle. Quick Intel's worker never relies on in-memory state — every handler reads/writes through `chrome.storage.local`. The top-level `chrome.runtime.onMessage.addListener` re-registers on every wake-up, which is the intended pattern.

### Message protocol
All popup ↔ background communication uses a discriminated union (`RuntimeMessage`) in `src/types/index.ts`. The worker's `onMessage` handler returns `true` to keep the channel open for async `sendResponse`.

### Error taxonomy
`AppError` with codes (`NO_API_KEY`, `RESTRICTED_PAGE`, `EMPTY_CONTENT`, `API_ERROR`, `INVALID_RESPONSE`, ...) is thrown in the worker, serialized into `{ code, message }`, and rendered by `<ErrorBanner/>` using a friendly message map.

### Content extraction
Not a persistent content script. `extractPageContent()` is injected via `chrome.scripting.executeScript({ func: ... })` only when the user clicks Summarize. Lower footprint, less privacy surface, faster page loads for the user.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Watch-mode build for local development |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run build:icons` | Regenerate icons from SVG source |
| `npm run package` | Build + zip `dist/` into `quick-intel.zip` for Chrome Web Store upload |
| `npm run clean` | Remove `dist/` |

## Publishing to the Chrome Web Store

1. `npm run package` → produces `quick-intel.zip`
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the zip, fill in store listing, privacy disclosures (this extension uses `storage`, `activeTab`, `scripting` — be explicit about the LLM API calls), and screenshots
4. Submit for review

## Project structure

```
src/
├── manifest.json              MV3 manifest (CSP, minimum-privilege perms)
├── background/service-worker.ts  Message router, summarization orchestrator
├── content/extractor.ts       Injected via chrome.scripting (self-contained)
├── popup/
│   ├── App.tsx                Tab container, state root
│   ├── components/            Header, SummaryCard, HistoryList, ...
│   └── index.css              Tailwind v4 + theme tokens
├── utils/
│   ├── llm.ts                 Provider-agnostic summarize() + validators (worker-only)
│   ├── storage.ts             chrome.storage.local wrapper + redacted public view
│   ├── clipboard.ts           Copy with fallback
│   ├── errors.ts              AppError + code taxonomy
│   ├── logger.ts              Dev-only gated logger
│   └── url-guard.ts           Restricted-URL detection
└── types/index.ts             Shared types + message protocol
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "This page can't be summarized" | Browser-internal URLs (`chrome://`, Web Store) are blocked by Chrome, not us. Use a regular site. |
| "Not enough content" | Page may still be loading, or it's mostly rendered client-side. Wait a moment and retry. |
| OpenAI 401 / Anthropic 401 / Gemini 400 | Key is invalid or missing. Check Settings. OpenAI keys start with `sk-`; Anthropic keys start with `sk-ant-`; Gemini keys start with `AIza`. |
| Popup shows blank after code change | Reload the extension from `chrome://extensions`. |
| Service worker not updating | In `chrome://extensions`, click the refresh icon on the Quick Intel card. |

## License

MIT

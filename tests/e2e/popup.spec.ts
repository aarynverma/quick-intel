import { test, expect, BrowserContext, Page } from '@playwright/test';
import { launchExtension, popupUrl, seedStorage } from './helpers/extension.js';

let context: BrowserContext;
let extensionId: string;
let popup: Page;

const BASE_SETTINGS = {
  provider: 'gemini',
  apiKeys: { gemini: 'AIza-test', openai: '', anthropic: '' },
  enhancer: { enabled: true, disabledDomains: [] },
};

test.beforeAll(async () => {
  ({ context, extensionId } = await launchExtension());
});

test.afterAll(async () => {
  await context.close();
});

test.beforeEach(async () => {
  popup = await context.newPage();
  await popup.goto(popupUrl(extensionId));
  await popup.evaluate(() => chrome.storage.local.clear());
  await popup.reload();
  await popup.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  await popup.close();
});

// ── Welcome screen ────────────────────────────────────────────────────────────

test('shows welcome screen when no API key is set', async () => {
  await expect(popup.getByText('Welcome to Quick Intel')).toBeVisible();
  await expect(popup.getByText("I have a key, let's go")).toBeVisible();
});

test('welcome screen lists all three providers', async () => {
  await expect(popup.getByText('Google Gemini')).toBeVisible();
  await expect(popup.getByText('OpenAI')).toBeVisible();
  await expect(popup.getByText('Anthropic')).toBeVisible();
});

test('clicking "I have a key" navigates to Settings', async () => {
  await popup.getByText("I have a key, let's go").click();
  // First settings section heading visible = we're on the settings tab
  await expect(popup.getByText('Provider')).toBeVisible();
});

// ── Settings ─────────────────────────────────────────────────────────────────

test('can enter a Gemini API key and save', async () => {
  await popup.getByText("I have a key, let's go").click();

  // Select Gemini provider via its pill button
  await popup.getByRole('button', { name: 'Gemini' }).first().click();

  // Key input appears with Gemini placeholder
  const keyInput = popup.getByPlaceholder('AIza...');
  await keyInput.fill('AIza-test-key-gemini-12345');

  await popup.getByRole('button', { name: 'Save settings' }).click();
  // After save, App switches to Summarize tab — that confirms save completed
  await expect(popup.getByRole('tab', { name: 'Summarize' })).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
});

test('settings tab is reachable from summarize tab', async () => {
  await popup.evaluate((s) => chrome.storage.local.set({ settings: s }), BASE_SETTINGS);
  await popup.reload();

  await popup.getByRole('tab', { name: 'Settings' }).click();
  await expect(popup.getByText('Provider')).toBeVisible();
});

test('enhancer can be toggled Off then back On', async () => {
  await popup.evaluate((s) => chrome.storage.local.set({ settings: s }), BASE_SETTINGS);
  await popup.reload();
  await popup.getByRole('tab', { name: 'Settings' }).click();

  await popup.getByRole('button', { name: 'Off' }).click();
  await popup.getByRole('button', { name: 'Save settings' }).click();
  // Save redirects to Summarize tab
  await expect(popup.getByRole('tab', { name: 'Summarize' })).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });

  // Reload, go back to settings — Off should be selected, then restore to On
  await popup.reload();
  await popup.getByRole('tab', { name: 'Settings' }).click();
  await popup.getByRole('button', { name: 'On' }).click();
  await popup.getByRole('button', { name: 'Save settings' }).click();
  await expect(popup.getByRole('tab', { name: 'Summarize' })).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
});

// ── History tab ───────────────────────────────────────────────────────────────

test('history tab shows empty state when no summaries', async () => {
  await popup.evaluate((s) => chrome.storage.local.set({ settings: s }), BASE_SETTINGS);
  await popup.reload();
  await popup.getByRole('tab', { name: 'History' }).click();
  await expect(popup.getByText(/no summaries yet/i)).toBeVisible();
});

test('history search filters entries', async () => {
  const entries = [
    { id: '1', title: 'React Hooks Guide', url: 'https://example.com/1', content: 'About hooks', style: 'bullet', createdAt: Date.now() },
    { id: '2', title: 'TypeScript Deep Dive', url: 'https://example.com/2', content: 'About TS', style: 'bullet', createdAt: Date.now() - 1000 },
  ];
  await popup.evaluate(([s, e]) =>
    chrome.storage.local.set({ settings: s, summary_history: e }),
    [BASE_SETTINGS, entries] as [typeof BASE_SETTINGS, typeof entries]
  );
  await popup.reload();
  await popup.getByRole('tab', { name: 'History' }).click();

  await expect(popup.getByText('React Hooks Guide')).toBeVisible();
  await expect(popup.getByText('TypeScript Deep Dive')).toBeVisible();

  await popup.getByPlaceholder(/search/i).fill('React');
  await expect(popup.getByText('React Hooks Guide')).toBeVisible();
  await expect(popup.getByText('TypeScript Deep Dive')).not.toBeVisible();
});

import { BrowserContext, chromium, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../../../dist');

export async function launchExtension(): Promise<{ context: BrowserContext; extensionId: string }> {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
      '--no-sandbox',
    ],
  });

  let extensionId = '';
  for (let i = 0; i < 20; i++) {
    const workers = context.serviceWorkers();
    const sw = workers.find(w => w.url().startsWith('chrome-extension://'));
    if (sw) {
      extensionId = new URL(sw.url()).hostname;
      break;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  if (!extensionId) throw new Error('Could not find extension service worker — is dist/ built?');
  return { context, extensionId };
}

export function popupUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/src/popup/index.html`;
}

// Seeds chrome.storage.local via a throwaway extension popup page.
// Must be used instead of calling chrome.storage from a regular page (no access).
export async function seedStorage(context: BrowserContext, extensionId: string, data: Record<string, unknown>): Promise<void> {
  const page = await context.newPage();
  await page.goto(popupUrl(extensionId));
  await page.evaluate((d) => chrome.storage.local.set(d), data);
  await page.close();
}

// Opens a page at a routed HTTPS URL so the content script is injected.
// Using page.route() intercepts at the network level while keeping the URL scheme real.
export async function openContentPage(context: BrowserContext, html: string): Promise<Page> {
  const TEST_URL = 'https://qi-test-page.internal/test';
  const page = await context.newPage();
  await page.route(TEST_URL, route =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: html })
  );
  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
  // Give the content script time to initialise
  await page.waitForTimeout(400);
  return page;
}

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { launchExtension, popupUrl, seedStorage, openContentPage } from './helpers/extension.js';

let context: BrowserContext;
let extensionId: string;

const FIELD_HTML = `<!DOCTYPE html><html><body style="padding:40px">
  <textarea id="field" style="width:400px;height:100px;font-size:16px;"></textarea>
</body></html>`;

const BASE_SETTINGS = {
  settings: {
    provider: 'gemini',
    apiKeys: { gemini: 'AIza-fake', openai: '', anthropic: '' },
    enhancer: { enabled: true, disabledDomains: [] },
  },
  enhancer_paused_until: 0,
};

// Reads the shadow host element count from a content page
async function shadowHostCount(page: Page): Promise<number> {
  return page.evaluate(() =>
    document.querySelectorAll('div[style*="2147483647"][style*="pointer-events"]').length
  );
}

// Reads the bolt button from shadow DOM
async function getBtnOpacity(page: Page): Promise<string> {
  return page.evaluate(() => {
    const hosts = [...document.querySelectorAll('div[style*="2147483647"]')] as HTMLElement[];
    for (const h of hosts) {
      const btn = h.shadowRoot?.querySelector<HTMLElement>('.qi-btn');
      if (btn) return btn.style.opacity;
    }
    return '';
  });
}

// Clicks an element inside the shadow DOM by selector
async function shadowClick(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    const hosts = [...document.querySelectorAll('div[style*="2147483647"]')] as HTMLElement[];
    for (const h of hosts) {
      const el = h.shadowRoot?.querySelector<HTMLElement>(sel);
      if (el) { el.click(); return; }
    }
  }, selector);
}

test.beforeAll(async () => {
  ({ context, extensionId } = await launchExtension());
  await seedStorage(context, extensionId, BASE_SETTINGS);
});

test.afterAll(async () => {
  await context.close();
});

// ── Bolt button lifecycle ─────────────────────────────────────────────────────

test('bolt button appears when a textarea is focused', async () => {
  const page = await openContentPage(context, FIELD_HTML);
  await page.locator('#field').click();
  await page.waitForTimeout(300);

  const count = await shadowHostCount(page);
  expect(count).toBeGreaterThan(0);
  await page.close();
});

test('bolt button disappears after field loses focus', async () => {
  const page = await openContentPage(context, FIELD_HTML);
  await page.locator('#field').click();
  await page.waitForTimeout(200);
  // Blur via JS — Tab would focus the bolt button inside shadow DOM and cancel the timer
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.waitForTimeout(300); // focusout debounce is 150ms

  const count = await shadowHostCount(page);
  expect(count).toBe(0);
  await page.close();
});

// ── Menu ──────────────────────────────────────────────────────────────────────

test('menu has correct items and no removed items', async () => {
  const page = await openContentPage(context, FIELD_HTML);
  await page.locator('#field').click();
  await page.waitForTimeout(300);

  await shadowClick(page, '.qi-corner-chev');
  await page.waitForTimeout(100);

  const menuItems = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('div[style*="2147483647"]')] as HTMLElement[];
    for (const h of hosts) {
      const items = [...(h.shadowRoot?.querySelectorAll('.qi-menu-item') ?? [])];
      if (items.length) return items.map(el => el.textContent?.trim() ?? '');
    }
    return [];
  });

  expect(menuItems.some(t => t.includes('Disable on this site'))).toBe(true);
  expect(menuItems.some(t => t.includes('Open settings'))).toBe(true);
  expect(menuItems.some(t => t.includes('Pause for 1 hour'))).toBe(true);
  expect(menuItems.some(t => t.includes('View history'))).toBe(false);
  expect(menuItems.some(t => t.includes('Clear all history'))).toBe(false);
  await page.close();
});

// ── Pause / resume ────────────────────────────────────────────────────────────

test('pause for 1 hour dims the bolt button', async () => {
  const page = await openContentPage(context, FIELD_HTML);
  await page.locator('#field').click();
  await page.waitForTimeout(300);

  await shadowClick(page, '.qi-corner-chev');
  await page.waitForTimeout(100);
  await shadowClick(page, '[data-action="pause"]');
  await page.waitForTimeout(300);

  const opacity = await getBtnOpacity(page);
  expect(opacity).toBe('0.45');

  // Cleanup: unpause via storage
  await seedStorage(context, extensionId, { enhancer_paused_until: 0 });
  await page.close();
});

test('paused enhancer does not show modal on click', async () => {
  // Seed paused state before opening the page
  await seedStorage(context, extensionId, { enhancer_paused_until: Date.now() + 3_600_000 });

  const page = await openContentPage(context, FIELD_HTML);
  await page.locator('#field').fill('this is a long enough prompt to pass the minimum length check here');
  await page.locator('#field').click();
  await page.waitForTimeout(400);

  await shadowClick(page, '.qi-btn');
  await page.waitForTimeout(500);

  // No modal host (inset:0) should exist
  const modalCount = await page.evaluate(() =>
    document.querySelectorAll('div[style*="inset: 0"]').length +
    document.querySelectorAll('div[style*="inset:0"]').length
  );
  expect(modalCount).toBe(0);

  await seedStorage(context, extensionId, { enhancer_paused_until: 0 });
  await page.close();
});

// ── Disable on this site ──────────────────────────────────────────────────────

test('disable on this site removes the bolt button', async () => {
  const page = await openContentPage(context, FIELD_HTML);
  await page.locator('#field').click();
  await page.waitForTimeout(300);

  await shadowClick(page, '.qi-corner-chev');
  await page.waitForTimeout(100);
  await shadowClick(page, '[data-action="disable"]');
  await page.waitForTimeout(300);

  expect(await shadowHostCount(page)).toBe(0);

  // Cleanup: re-enable the site by clearing disabled domains
  await seedStorage(context, extensionId, BASE_SETTINGS);
  await page.close();
});

// ── Short text guard ──────────────────────────────────────────────────────────

test('clicking bolt with fewer than 5 chars does nothing', async () => {
  const page = await openContentPage(context, FIELD_HTML);
  await page.locator('#field').fill('hi');
  await page.locator('#field').click();
  await page.waitForTimeout(300);

  await shadowClick(page, '.qi-btn');
  await page.waitForTimeout(400);

  const modalCount = await page.evaluate(() =>
    document.querySelectorAll('div[style*="inset: 0"]').length +
    document.querySelectorAll('div[style*="inset:0"]').length
  );
  expect(modalCount).toBe(0);
  await page.close();
});

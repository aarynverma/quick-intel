import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1, // extensions share browser state — keep sequential
  use: {
    headless: false, // extensions require headed mode
  },
  projects: [
    {
      name: 'chrome-extension',
      use: {
        // passed through to test fixtures via env
        channel: 'chromium',
      },
    },
  ],
  reporter: [['list'], ['html', { outputFolder: 'tests/e2e/report', open: 'never' }]],
});

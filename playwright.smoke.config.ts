import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.VITE_APP_URL;

if (!baseURL) {
  throw new Error('Set PLAYWRIGHT_BASE_URL or VITE_APP_URL for smoke tests');
}

const browserChannel = process.env.CI ? undefined : ('chrome' as const);

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'smoke-production.spec.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: browserChannel ?? 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
  ],
});

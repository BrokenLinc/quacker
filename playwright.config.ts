import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
// Bundled Chromium often hangs in agent/sandbox runs; use installed Chrome locally.
const browserChannel = process.env.CI ? undefined : ('chrome' as const);

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: process.env.PLAYWRIGHT_SKIP_GLOBAL_SETUP
    ? undefined
    : './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'smoke',
      testMatch: /(a11y-home|auth-flow|smoke-production)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
    {
      name: 'integration',
      testMatch: /(a11y-group|group-messaging)\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
  ],
});

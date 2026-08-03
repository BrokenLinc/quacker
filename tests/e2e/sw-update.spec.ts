import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * The preview server reads `dist` per request, so rewriting the built worker is
 * how we stand in for a new deployment. Playwright's request interception does
 * not cover the service worker script itself, which is why this goes through
 * the filesystem.
 */
const SW_PATH = path.resolve('dist/sw.js');

const swExists = fs.existsSync(SW_PATH);

test.describe('service worker update', () => {
  test.skip(
    !swExists,
    'needs a local `yarn build` output; the production smoke run has no dist'
  );

  test('prompts before activating and reloads once', async ({ page }) => {
    const original = fs.readFileSync(SW_PATH, 'utf8');

    try {
      await page.goto('/');
      await expect(page.getByTestId('sign-in-screen')).toBeVisible();
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (navigator.serviceWorker.controller) return;
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () =>
            resolve()
          );
          setTimeout(resolve, 10_000);
        });
      });

      // Survives the update only if the page is not reloaded behind our back.
      await page.evaluate(() => {
        (window as Window & { __yowlSession?: number }).__yowlSession =
          Date.now();
      });

      fs.writeFileSync(SW_PATH, `${original}\n// deploy ${Date.now()}\n`);

      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
      });

      // A waiting worker must ask rather than take over mid-session.
      await expect(page.getByTestId('sw-update-prompt')).toBeVisible({
        timeout: 30_000,
      });
      expect(
        await page.evaluate(
          () => (window as Window & { __yowlSession?: number }).__yowlSession
        )
      ).toBeTruthy();

      const navigated = page.waitForEvent('framenavigated');
      await page
        .getByTestId('sw-update-prompt')
        .getByRole('button', { name: 'Reload' })
        .click();

      // Accepting the update reloads, so the sentinel is gone and the app is
      // back on its feet.
      await navigated;
      await page.waitForLoadState('domcontentloaded');
      expect(
        await page.evaluate(
          () => (window as Window & { __yowlSession?: number }).__yowlSession
        )
      ).toBeUndefined();
      await expect(page.getByTestId('sign-in-screen')).toBeVisible();
      await expect(page.getByTestId('sw-update-prompt')).toBeHidden();

      // And only once — a second controllerchange must not restart the cycle.
      await page.evaluate(() => {
        (window as Window & { __yowlSession?: number }).__yowlSession = 1;
      });
      await page.waitForTimeout(3_000);
      expect(
        await page.evaluate(
          () => (window as Window & { __yowlSession?: number }).__yowlSession
        )
      ).toBe(1);
    } finally {
      fs.writeFileSync(SW_PATH, original);
    }
  });
});

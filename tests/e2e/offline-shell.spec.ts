import { expect, test } from '@playwright/test';

/**
 * Cold-launch behavior with no network. These run without Supabase: the point is
 * that the precached shell boots and routes, not that data loads.
 */

/**
 * Resolves once the worker is not just active but *controlling* this page —
 * runtime caching only sees fetches from a controlled client.
 */
const waitForServiceWorker = async (page: import('@playwright/test').Page) => {
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
};

test.describe('offline app shell', () => {
  test('boots from the precache with no network', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('sign-in-screen')).toBeVisible();
    await waitForServiceWorker(page);

    await page.context().setOffline(true);
    await page.reload();

    // Without a precached shell this is the browser's offline error page.
    await expect(page.getByTestId('sign-in-screen')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('img', { name: 'Yowl' })).toBeVisible();

    await page.context().setOffline(false);
  });

  test('serves the shell for a deep link with no network', async ({ page }) => {
    await page.goto('/');
    await waitForServiceWorker(page);

    await page.context().setOffline(true);
    // A client-rendered route that was never visited, so it cannot have been
    // cached as a document — the navigation fallback has to answer it.
    await page.goto('/suggestions');

    await expect(page.getByTestId('sign-in-screen')).toBeVisible({
      timeout: 20_000,
    });

    await page.context().setOffline(false);
  });

  test('caches remote avatars for offline reuse', async ({ page }) => {
    await page.goto('/');
    await waitForServiceWorker(page);

    await page.evaluate(() =>
      fetch('https://0.gravatar.com/avatar/0?d=identicon&s=64', {
        mode: 'no-cors',
      }).then(() => undefined)
    );

    // CacheFirst writes the response after returning it, so poll rather than
    // reading the cache once.
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const cache = await caches.open('yowl-avatars');
            const keys = await cache.keys();
            return keys.filter((request) =>
              request.url.includes('gravatar.com')
            ).length;
          }),
        { timeout: 10_000 }
      )
      .toBe(1);
  });
});

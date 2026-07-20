import { expect, test } from '@playwright/test';

import { seedTestSession } from './fixtures/supabase';

test('programmatic session seed signs user in', async ({ page }) => {
  await seedTestSession(page);

  await expect(page.getByTestId('user-menu-button')).toBeVisible({
    timeout: 10_000,
  });
});

test('protected group page shows sign-in screen when logged out', async ({
  page,
}) => {
  const appOrigin =
    process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

  await page.goto(`${appOrigin}/00000000-0000-4000-8000-000000000001`);
  await expect(page.getByTestId('route-loading')).toBeHidden({
    timeout: 15_000,
  });

  await expect(page.getByTestId('sign-in-screen')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId('group-title')).toBeHidden();
  await expect(page.getByTestId('message-editor')).toBeHidden();
  await expect(page.getByTestId('header-log-in')).toBeHidden();
});

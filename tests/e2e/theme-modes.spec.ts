import { expect, test } from '@playwright/test';

import { seedAuthenticatedSession } from './fixtures/supabase';
import { expectColorMode, seedColorMode } from './fixtures/theme';

/**
 * In-app toggle (sidebar). Requires auth — smoke project / full e2e only.
 * Unsigned canvas coverage lives in a11y-home (both modes, no Supabase).
 */
test('color mode toggle switches raised document and theme-color', async ({
  page,
}) => {
  await seedColorMode(page, 'light');
  await seedAuthenticatedSession(page);
  await expect(
    page.getByRole('button', { name: 'Switch to dark mode' })
  ).toBeVisible();
  await expectColorMode(page, 'light');

  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(
    page.getByRole('button', { name: 'Switch to light mode' })
  ).toBeVisible();
  await expectColorMode(page, 'dark');

  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(
    page.getByRole('button', { name: 'Switch to dark mode' })
  ).toBeVisible();
  await expectColorMode(page, 'light');
});

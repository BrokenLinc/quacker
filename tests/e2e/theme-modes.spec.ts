import { expect, test } from '@playwright/test';

import { seedAuthenticatedSession } from './fixtures/supabase';
import {
  COLOR_MODE_STORAGE_KEY,
  expectColorMode,
  seedColorMode,
} from './fixtures/theme';

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

/**
 * Regression: Chakra useSystemColorMode must not overwrite the stored toggle
 * when prefers-color-scheme changes (iOS Automatic / daily OS schedule).
 */
test('color mode preference survives OS appearance changes', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await seedColorMode(page, 'dark');
  await seedAuthenticatedSession(page);
  await expect(
    page.getByRole('button', { name: 'Switch to light mode' })
  ).toBeVisible();
  await expectColorMode(page, 'dark');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expectColorMode(page, 'dark');
  await expect
    .poll(async () =>
      page.evaluate((key) => localStorage.getItem(key), COLOR_MODE_STORAGE_KEY)
    )
    .toBe('dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await expectColorMode(page, 'dark');
  await expect
    .poll(async () =>
      page.evaluate((key) => localStorage.getItem(key), COLOR_MODE_STORAGE_KEY)
    )
    .toBe('dark');
});

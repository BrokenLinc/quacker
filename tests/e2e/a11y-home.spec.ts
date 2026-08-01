import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import {
  expectColorMode,
  seedColorMode,
  type AppColorMode,
} from './fixtures/theme';

/**
 * Home a11y + canvas chrome for both color modes in one file.
 * Seeds `chakra-ui-color-mode` (no auth) — cheap enough for verify smoke.
 * Logged-out home is chrome-less FTUE (large logo on sign-in screen).
 */
for (const mode of ['light', 'dark'] as AppColorMode[]) {
  test(`home page ${mode} mode: canvas + no critical a11y violations`, async ({
    page,
  }) => {
    await seedColorMode(page, mode);
    await page.goto('/');
    await expect(page.getByTestId('sign-in-screen')).toBeVisible();
    await expect(page.getByTestId('sign-in-logo')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Yowl' })).toBeVisible();
    await expect(page.getByTestId('header-log-in')).toBeHidden();
    await expectColorMode(page, mode);

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });
}

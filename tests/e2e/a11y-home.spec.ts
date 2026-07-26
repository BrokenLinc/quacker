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
 */
for (const mode of ['light', 'dark'] as AppColorMode[]) {
  test(`home page ${mode} mode: canvas + no critical a11y violations`, async ({
    page,
  }) => {
    await seedColorMode(page, mode);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'hork' })).toBeVisible();
    await expectColorMode(page, mode);

    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });
}

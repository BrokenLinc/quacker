import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Smoke against whatever BASE_URL is configured (CI preview build, or
 * production via playwright.smoke.config.ts). Logged-out home is chrome-less
 * FTUE — brand is the logo image, not the header Yowl button.
 */
test('production home loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByTestId('sign-in-screen')).toBeVisible();
  await expect(page.getByTestId('sign-in-logo')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Yowl' })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  expect(critical).toEqual([]);
});

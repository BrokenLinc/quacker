import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('production home loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByRole('link', { name: 'hork', exact: true })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  expect(critical).toEqual([]);
});

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import {
  gotoGroupPage,
  seedTestGroup,
  seedTestSession,
} from './fixtures/supabase';

test('group page share modal passes a11y', async ({ page }) => {
  const { admin, userId } = await seedTestSession(page);

  const group = await seedTestGroup(admin, userId, {
    slug: `e2e${Date.now().toString(36).slice(-5)}`,
    name: 'E2E Test Group',
    authorName: 'E2E',
  });

  await gotoGroupPage(page, group);

  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByText('Copy link')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  expect(critical).toEqual([]);
});

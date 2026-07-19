import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { seedTestSession } from './fixtures/supabase';

test('group page share modal passes a11y', async ({ page }) => {
  const { admin, userId } = await seedTestSession(page);

  const slug = `e2e${Date.now().toString(36).slice(-5)}`;
  const { data: group, error } = await admin
    .from('groups')
    .insert({
      slug,
      creator_id: userId,
      name: 'E2E Test Group',
      author_name: 'E2E',
    })
    .select()
    .single();

  expect(error).toBeNull();
  await page.reload();

  await page.goto(`/${group!.id}`);
  await expect(page.getByRole('heading', { name: 'E2E Test Group' })).toBeVisible();

  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByText('Copy link')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  expect(critical).toEqual([]);
});

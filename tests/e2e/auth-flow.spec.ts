import { expect, test } from '@playwright/test';

import { seedTestSession } from './fixtures/supabase';

test('programmatic magic-link session signs user in', async ({ page }) => {
  await seedTestSession(page);
  await page.reload();

  await expect(page.getByPlaceholder('you@email.com')).not.toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Magic link' })).not.toBeVisible();
});

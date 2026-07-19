import { expect, test } from '@playwright/test';

import { seedTestSession } from './fixtures/supabase';

test('programmatic magic-link session signs user in', async ({ page }) => {
  const { email } = await seedTestSession(page);
  await page.reload();

  const localPart = email.split('@')[0];
  await expect(page.getByPlaceholder('you@email.com')).not.toBeVisible();
  await expect(page.getByRole('button', { name: localPart })).toBeVisible({
    timeout: 10_000,
  });
});

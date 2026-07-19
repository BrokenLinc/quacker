import { expect, test } from '@playwright/test';

import { seedTestSession } from './fixtures/supabase';

test('programmatic magic-link session signs user in', async ({ page }) => {
  const { email } = await seedTestSession(page);
  await page.reload();

  await expect(page.getByRole('img', { name: email, exact: true })).toBeVisible({
    timeout: 10_000,
  });
});

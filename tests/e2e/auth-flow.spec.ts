import { expect, test } from '@playwright/test';

import { seedTestSession } from './fixtures/supabase';

test('programmatic magic-link session signs user in', async ({ page }) => {
  const { email } = await seedTestSession(page);
  await page.reload();

  await expect(page.getByText(email.split('@')[0], { exact: false })).toBeVisible({
    timeout: 10_000,
  });
});

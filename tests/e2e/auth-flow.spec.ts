import { expect, test } from '@playwright/test';

import { seedTestSession } from './fixtures/supabase';

test('programmatic session seed signs user in', async ({ page }) => {
  await seedTestSession(page);

  await expect(page.getByTestId('user-menu-button')).toBeVisible({
    timeout: 10_000,
  });
});

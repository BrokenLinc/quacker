import { expect, test } from '@playwright/test';

import { seedTestSession } from './fixtures/supabase';

test('email OTP sign-in completes session', async ({ page }) => {
  await seedTestSession(page);

  await expect(page.getByTestId('user-menu-button')).toBeVisible({
    timeout: 10_000,
  });
});

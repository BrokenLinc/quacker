import { expect, test } from '@playwright/test';

import {
  seedAuthenticatedSession,
  seedFtueSession,
} from './fixtures/supabase';

test('programmatic session seed signs user in', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await expect(page.getByTestId('user-menu-button')).toBeVisible({
    timeout: 10_000,
  });
});

test('protected group page shows sign-in screen when logged out', async ({
  page,
}) => {
  const appOrigin =
    process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

  await page.goto(`${appOrigin}/00000000-0000-4000-8000-000000000001`);
  await expect(page.getByTestId('route-loading')).toBeHidden({
    timeout: 15_000,
  });

  await expect(page.getByTestId('sign-in-screen')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId('sign-in-logo')).toBeVisible();
  await expect(page.getByTestId('group-title')).toBeHidden();
  await expect(page.getByTestId('message-editor')).toBeHidden();
  await expect(page.getByTestId('header-log-in')).toBeHidden();
});

test('logged-out home is chrome-less FTUE with phone prompt', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('sign-in-screen')).toBeVisible();
  await expect(page.getByTestId('sign-in-logo')).toBeVisible();
  await expect(
    page.getByText(
      'Start a chat room and share it with anyone, right now. Perfect for work trips and meetups.'
    )
  ).toBeVisible();
  await expect(
    page.getByText('All you need is a phone number:')
  ).toBeVisible();
  await expect(page.getByTestId('sign-in-phone')).toBeVisible();
  await expect(page.getByTestId('header-log-in')).toBeHidden();
});

test('post-auth onboarding shows for phone-fallback display name', async ({
  page,
}) => {
  await seedFtueSession(page);

  await expect(page.getByTestId('post-auth-onboarding')).toBeVisible();
  await expect(page.getByText("What's your name?")).toBeVisible();
  await expect(page.getByTestId('display-name-input')).toBeVisible();
  await expect(page.getByTestId('notifications-switch')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  // Still in FTUE — account chrome not yet.
  await expect(page.getByTestId('user-menu-button')).toBeHidden();

  await page.getByTestId('display-name-input').fill('Fox');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByTestId('ftue-create-room')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText('Start a chat room')).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();

  await expect(page.getByTestId('user-menu-button')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId('post-auth-onboarding')).toBeHidden();
});

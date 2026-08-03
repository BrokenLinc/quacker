import { expect, test } from '@playwright/test';

import { seedAuthenticatedSession } from './fixtures/supabase';

test('suggestions nav opens list and create form', async ({ page }) => {
  await seedAuthenticatedSession(page);

  await expect(page.getByTestId('suggestions-nav')).toBeVisible({
    timeout: 10_000,
  });
  await page.getByTestId('suggestions-nav').click();

  // exact: true — empty state "No suggestions yet" also contains "Suggestions"
  await expect(
    page.getByRole('heading', { name: 'Suggestions', exact: true })
  ).toBeVisible();
  await expect(page.getByLabel('Search suggestions')).toBeVisible();
  await expect(page.getByLabel('Mine')).toBeVisible();

  await page.getByTestId('make-suggestion').click();
  await expect(
    page.getByRole('heading', { name: 'Make a suggestion', exact: true })
  ).toBeVisible();
  await expect(page.getByLabel('Title')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Feature request' })).toBeChecked();

  // IconButton as={RouteLink} exposes role=link, not button
  await page.getByRole('link', { name: 'Back to suggestions' }).click();
  await expect(
    page.getByRole('heading', { name: 'Suggestions', exact: true })
  ).toBeVisible();
});

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
  await expect(page.getByLabel('Search')).toBeHidden();
  await expect(page.getByLabel('Mine')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();

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

test('suggestion detail shows full body and accepts replies', async ({
  page,
}) => {
  const { displayName } = await seedAuthenticatedSession(page);

  const title = `Detail page thread ${Date.now()}`;
  const longBody =
    'First line of the suggestion. Second line that would be clipped in the list. Third line for good measure.';

  await page.getByTestId('suggestions-nav').click();
  await page.getByTestId('make-suggestion').click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Suggestion').fill(longBody);
  await page.getByRole('button', { name: 'Submit suggestion' }).click();

  await expect(
    page.getByRole('heading', { name: 'Suggestions', exact: true })
  ).toBeVisible({ timeout: 10_000 });

  const row = page.getByTestId('suggestion-row').filter({ hasText: title });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.getByRole('link', { name: `Open suggestion: ${title}` }).click();

  await expect(page.getByTestId('suggestion-detail')).toBeVisible();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  // Full body is visible on the detail page (list clips with noOfLines={1}).
  await expect(
    page.getByTestId('suggestion-detail').getByText('Third line for good measure.')
  ).toBeVisible();

  await expect(
    page.getByText('No comments yet. Be the first to reply.')
  ).toBeVisible();

  await page.getByTestId('suggestion-comment-input').fill('Looks good to me');
  await page.getByTestId('suggestion-comment-submit').click();

  await expect(page.getByTestId('suggestion-comment')).toContainText(
    'Looks good to me'
  );
  await expect(page.getByTestId('suggestion-comment')).toContainText(
    displayName
  );
  await expect(page.getByTestId('suggestion-comment-input')).toHaveValue('');

  await page.getByRole('link', { name: 'Back to suggestions' }).click();
  await expect(
    page.getByRole('heading', { name: 'Suggestions', exact: true })
  ).toBeVisible();

  const listed = page.getByTestId('suggestion-row').filter({ hasText: title });
  await expect(listed.getByTestId('suggestion-comment-count')).toHaveText('1');
});

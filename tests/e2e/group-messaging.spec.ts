import { expect, test } from '@playwright/test';

import {
  gotoGroupPage,
  seedTestGroup,
  seedAuthenticatedSession,
} from './fixtures/supabase';
import { pasteIntoInput } from './fixtures/clipboard';

test.describe('group messaging', () => {
  test.describe.configure({ mode: 'serial' });

  test('member can post and see message in feed', async ({ page }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);

    const group = await seedTestGroup(admin, userId, {
      slug: `msg${Date.now().toString(36).slice(-5)}`,
      name: 'Messaging Test',
    });

    await gotoGroupPage(page, group);

    const messageText = `Hello from e2e ${Date.now()}`;
    const editor = page.getByTestId('message-editor');
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click();
    await page.keyboard.type(messageText);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect
      .poll(async () => page.getByText(messageText).count(), { timeout: 15_000 })
      .toBeGreaterThan(0);
  });

  test('realtime updates when message inserted via admin', async ({ page }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);

    const group = await seedTestGroup(admin, userId, {
      slug: `rt${Date.now().toString(36).slice(-5)}`,
      name: 'Realtime Test',
    });

    await gotoGroupPage(page, group);

    const realtimeText = `Realtime ${Date.now()}`;
    await admin.from('messages').insert({
      group_id: group.id,
      author_id: userId,
      author_name: 'Admin',
      text: realtimeText,
    });

    await expect
      .poll(async () => page.getByText(realtimeText).count(), { timeout: 20_000 })
      .toBeGreaterThan(0);
  });

  test('link popover accepts typed and pasted URLs on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const { admin, userId } = await seedAuthenticatedSession(page);
    const group = await seedTestGroup(admin, userId, {
      slug: `lnk${Date.now().toString(36).slice(-5)}`,
      name: 'Composer URL Test',
    });

    await gotoGroupPage(page, group);

    const editor = page.getByTestId('message-editor');
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click();
    await page.keyboard.type('see this');

    await page.getByRole('button', { name: 'Link', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Add link' })).toBeVisible();

    const urlInput = page.getByLabel('Link URL');
    await urlInput.fill('example.com/path');
    await expect(urlInput).toHaveValue('example.com/path');

    await urlInput.clear();
    await pasteIntoInput(urlInput, 'https://yowl.us/docs');
    await expect(urlInput).toHaveValue('https://yowl.us/docs');
  });

  test('member can add and toggle an emoji reaction', async ({ page }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);

    const group = await seedTestGroup(admin, userId, {
      slug: `rxn${Date.now().toString(36).slice(-5)}`,
      name: 'Reactions Test',
    });

    await gotoGroupPage(page, group);

    const messageText = `React to me ${Date.now()}`;
    const editor = page.getByTestId('message-editor');
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click();
    await page.keyboard.type(messageText);
    await page.getByRole('button', { name: 'Send' }).click();

    await expect
      .poll(async () => page.getByText(messageText).count(), { timeout: 15_000 })
      .toBeGreaterThan(0);

    const addReaction = page.getByTestId('message-add-reaction').last();
    await expect(addReaction).toBeVisible();
    await addReaction.click();

    await expect(
      page.getByRole('dialog', { name: 'Add reaction' })
    ).toBeVisible();
    await page.getByRole('button', { name: 'React with 👍' }).click();

    const chip = page.getByTestId('message-reaction-chip-👍');
    await expect(chip).toBeVisible({ timeout: 10_000 });
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(chip).toContainText('1');

    await chip.click();
    await expect(chip).toBeHidden({ timeout: 10_000 });
  });
});

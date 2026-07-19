import { expect, test } from '@playwright/test';

import {
  gotoGroupPage,
  seedTestGroup,
  seedTestSession,
} from './fixtures/supabase';

test.describe('group messaging', () => {
  test.describe.configure({ mode: 'serial' });

  test('member can post and see message in feed', async ({ page }) => {
    const { admin, userId } = await seedTestSession(page);

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
    const { admin, userId } = await seedTestSession(page);

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
});

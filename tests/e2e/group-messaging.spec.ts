import { expect, test } from '@playwright/test';

import { seedTestSession } from './fixtures/supabase';

test('member can post and see message in feed', async ({ page }) => {
  const { admin, userId } = await seedTestSession(page);

  const slug = `msg${Date.now().toString(36).slice(-5)}`;
  const { data: group } = await admin
    .from('groups')
    .insert({
      slug,
      creator_id: userId,
      name: 'Messaging Test',
      author_name: 'Tester',
    })
    .select()
    .single();

  await page.reload();
  await page.goto(`/${group!.id}`);
  await expect(page.getByText('Messaging Test')).toBeVisible({ timeout: 10_000 });

  const messageText = `Hello from e2e ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Say something!' }).click();
  await page.keyboard.type(messageText);
  await page.getByRole('button', { name: 'Send' }).click();

  await expect.poll(async () => page.getByText(messageText).count()).toBeGreaterThan(0);
});

test('realtime updates when message inserted via admin', async ({ page }) => {
  const { admin, userId } = await seedTestSession(page);

  const slug = `rt${Date.now().toString(36).slice(-5)}`;
  const { data: group } = await admin
    .from('groups')
    .insert({
      slug,
      creator_id: userId,
      name: 'Realtime Test',
      author_name: 'Tester',
    })
    .select()
    .single();

  await admin.from('group_members').upsert({
    group_id: group!.id,
    user_id: userId,
    role: 'creator',
  });

  await page.reload();
  await page.goto(`/${group!.id}`);

  const realtimeText = `Realtime ${Date.now()}`;
  await admin.from('messages').insert({
    group_id: group!.id,
    author_id: userId,
    author_name: 'Admin',
    text: realtimeText,
  });

  await expect(page.getByText(realtimeText)).toBeVisible({ timeout: 15_000 });
});

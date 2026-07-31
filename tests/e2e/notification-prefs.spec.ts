import { expect, test } from '@playwright/test';

import {
  getPushPermissionRequestCount,
  installPushMocks,
} from './fixtures/push';
import {
  gotoGroupPage,
  seedTestGroup,
  seedTestSession,
} from './fixtures/supabase';

test.describe('notification prefs', () => {
  test.describe.configure({ mode: 'serial' });

  test('Account switch enables push after explicit toggle', async ({ page }) => {
    await installPushMocks(page);
    const { admin, userId } = await seedTestSession(page);

    await expect.poll(async () => getPushPermissionRequestCount(page)).toBe(0);

    await page.getByTestId('user-menu-button').click();
    await page
      .getByRole('dialog', { name: 'Account' })
      .getByRole('button', { name: /Notifications/i })
      .click();

    const toggle = page.getByTestId('notifications-switch');
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();

    await toggle.click();

    await expect
      .poll(async () => getPushPermissionRequestCount(page), { timeout: 10_000 })
      .toBe(1);

    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from('user_notification_prefs')
            .select('push_enabled')
            .eq('user_id', userId)
            .maybeSingle();
          return data?.push_enabled ?? false;
        },
        { timeout: 10_000 }
      )
      .toBe(true);

    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', userId);
          return data?.length ?? 0;
        },
        { timeout: 10_000 }
      )
      .toBeGreaterThan(0);
  });

  test('join prompt persists notify level', async ({ page }) => {
    await installPushMocks(page);
    const { admin, userId: joinerId } = await seedTestSession(page);

    const { data: creatorData, error: creatorError } =
      await admin.auth.admin.createUser({
        email: `e2e-creator-${Date.now()}@quacker.test`,
        email_confirm: true,
      });
    if (creatorError || !creatorData.user) {
      throw creatorError ?? new Error('No creator');
    }

    const group = await seedTestGroup(admin, creatorData.user.id, {
      slug: `jn${Date.now().toString(36).slice(-5)}`,
      name: 'Join Notify Test',
    });

    await page.goto(`/${group.id}`);
    await expect(page.getByTestId('route-loading')).toBeHidden({
      timeout: 15_000,
    });
    await expect(page.getByTestId('join-group')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('notify-level')).toBeVisible();

    await page.getByTestId('notify-level-announcements').click();
    await page.getByTestId('join-group').click();

    await expect(page.getByTestId('message-editor')).toBeVisible({
      timeout: 15_000,
    });

    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from('group_members')
            .select('notify_level')
            .eq('group_id', group.id)
            .eq('user_id', joinerId)
            .maybeSingle();
          return data?.notify_level ?? null;
        },
        { timeout: 10_000 }
      )
      .toBe('announcements');
  });

  test('group overflow can change notify level', async ({ page }) => {
    await installPushMocks(page);
    const { admin, userId } = await seedTestSession(page);

    const group = await seedTestGroup(admin, userId, {
      slug: `ov${Date.now().toString(36).slice(-5)}`,
      name: 'Overflow Notify Test',
    });

    await gotoGroupPage(page, group);

    await page.getByRole('button', { name: `${group.name} options` }).click();
    await page
      .getByRole('dialog', { name: group.name })
      .getByRole('button', { name: /Notifications/i })
      .click();

    await expect(page.getByTestId('notify-level')).toBeVisible();
    await page.getByTestId('notify-level-none').click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from('group_members')
            .select('notify_level')
            .eq('group_id', group.id)
            .eq('user_id', userId)
            .maybeSingle();
          return data?.notify_level ?? null;
        },
        { timeout: 10_000 }
      )
      .toBe('none');
  });
});

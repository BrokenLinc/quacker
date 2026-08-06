import { expect, test } from '@playwright/test';

import {
  seedAuthenticatedSession,
  seedSuperAdminSession,
  seedTestGroup,
  seedTestSession,
} from './fixtures/supabase';

test.describe('super admin', () => {
  test('nav is hidden for normal users', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await expect(page.getByTestId('suggestions-nav')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('superadmin-nav')).toHaveCount(0);
  });

  test('flyout, lists, lockdown, and admin message', async ({ page }) => {
    const { admin, userId } = await seedSuperAdminSession(page);

    await expect(page.getByTestId('superadmin-nav')).toBeVisible({
      timeout: 10_000,
    });
    await page.getByTestId('superadmin-nav').click();
    await expect(
      page.getByRole('dialog', { name: 'SuperAdmin' })
    ).toBeVisible();
    await expect(page.getByTestId('site-lockdown-switch')).toBeVisible();

    await page.getByRole('button', { name: 'All groups' }).click();
    await expect(page.getByTestId('admin-groups-page')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'All groups', exact: true })
    ).toBeVisible();

    await page.getByTestId('superadmin-nav').click();
    await page.getByRole('button', { name: 'All users' }).click();
    await expect(page.getByTestId('admin-users-page')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'All users', exact: true })
    ).toBeVisible();

    const group = await seedTestGroup(admin, userId, {
      name: 'Admin Post Room',
      slug: `admin-post-${Date.now()}`,
      authorName: 'E2E SuperAdmin',
    });

    // Soft-delete as creator, then reopen as SuperAdmin.
    await admin
      .from('groups')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', group.id);

    await page.goto(`/${group.id}`);
    await expect(page.getByTestId('group-deleted-banner')).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: 'Restore' }).click();
    await expect(page.getByTestId('group-deleted-banner')).toHaveCount(0);

    // Leave membership so posting goes through admin RLS path.
    await admin
      .from('group_members')
      .delete()
      .eq('group_id', group.id)
      .eq('user_id', userId);

    await page.goto(`/${group.id}`);
    await expect(page.getByTestId('posting-as-admin-banner')).toBeVisible({
      timeout: 10_000,
    });
    const editor = page.locator('.ProseMirror').first();
    await editor.click();
    await page.keyboard.type('Hello from admin');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByTestId('admin-message-row')).toContainText(
      'Yowl Admin'
    );
    await expect(page.getByTestId('admin-message-row')).toContainText(
      'Hello from admin'
    );

    // Lockdown: normal users see offline; SuperAdmin keeps access.
    await page.getByTestId('superadmin-nav').click();
    await page.getByTestId('site-lockdown-switch').click();
    await expect(page.getByTestId('site-offline')).toHaveCount(0);

    await seedTestSession(page);
    await expect(page.getByTestId('site-offline')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("We're working on it!")).toBeVisible();

    // Cleanup lockdown for other specs.
    await admin
      .from('site_settings')
      .update({ lockdown: false })
      .eq('id', true);
  });
});

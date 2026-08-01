import { expect, test, type Page } from '@playwright/test';

import {
  gotoGroupPage,
  seedTestGroup,
  seedTestSession,
} from './fixtures/supabase';

/** Chakra `md` is 48em / 768px — cover below, at, and above. */
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
] as const;

async function expectTitleLeftAligned(page: Page, viewportWidth: number) {
  const title = page.getByTestId('group-title');
  const invite = page.getByRole('button', { name: 'Invite someone' });

  await expect(title).toBeVisible();
  await expect(invite).toBeVisible();

  // Wait until layout has settled after a breakpoint change.
  await expect
    .poll(async () => {
      const titleBox = await title.boundingBox();
      const inviteBox = await invite.boundingBox();
      if (!titleBox || !inviteBox) return false;
      // Title text must not be collapsed (MorphingPopover once used lineHeight={0}).
      if (titleBox.height < 10) return false;
      const titleEndsLeftOfInvite =
        titleBox.x + titleBox.width <= inviteBox.x + 1;
      const titleInLeftHalf = titleBox.x + titleBox.width / 2 < viewportWidth / 2;
      return titleEndsLeftOfInvite && titleInLeftHalf;
    })
    .toBe(true);
}

test.describe('group header title', () => {
  test.describe.configure({ mode: 'serial' });

  test('room title is visible and left-aligned on all screen sizes', async ({
    page,
  }) => {
    const { admin, userId } = await seedTestSession(page);
    const group = await seedTestGroup(admin, userId, {
      slug: `hdr${Date.now().toString(36).slice(-5)}`,
      name: 'Header Title Room',
    });

    await page.setViewportSize(VIEWPORTS[0]);
    await gotoGroupPage(page, group);

    for (const vp of VIEWPORTS) {
      await test.step(`${vp.name} (${vp.width}×${vp.height})`, async () => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expect(page.getByTestId('group-title')).toBeVisible();
        await expect(page.getByTestId('group-title')).toHaveText(group.name);
        await expectTitleLeftAligned(page, vp.width);
      });
    }
  });
});

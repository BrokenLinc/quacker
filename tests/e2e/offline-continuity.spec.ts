import { expect, test, type Page } from '@playwright/test';

import {
  gotoGroupPage,
  seedAuthenticatedSession,
  seedTestGroup,
} from './fixtures/supabase';

/** Query hashes currently persisted to IndexedDB by the cache persister. */
const readPersistedQueryHashes = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const request = indexedDB.open('quacker-query-cache');
        request.onerror = () => resolve([]);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('keyval')) {
            resolve([]);
            return;
          }
          const read = db
            .transaction('keyval')
            .objectStore('keyval')
            .get('client');
          read.onerror = () => resolve([]);
          read.onsuccess = () => {
            const queries =
              (
                read.result as
                  | { clientState?: { queries?: { queryHash: string }[] } }
                  | undefined
              )?.clientState?.queries ?? [];
            resolve(queries.map((query) => query.queryHash));
          };
        };
      })
  );

/**
 * Deliver a service-worker message to the page. `ServiceWorkerContainer` is an
 * EventTarget, so this exercises exactly the listener the real SW talks to
 * without needing a live push subscription.
 */
const dispatchServiceWorkerMessage = (page: Page, data: unknown) =>
  page.evaluate((payload) => {
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent('message', { data: payload })
    );
  }, data);

test.describe('offline continuity', () => {
  test.describe.configure({ mode: 'serial' });

  test('re-entering a room renders from cache with the network blocked', async ({
    page,
  }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);
    const group = await seedTestGroup(admin, userId, {
      slug: `re${Date.now().toString(36).slice(-5)}`,
      name: 'Cache Reentry',
    });

    const messageText = `Cached message ${Date.now()}`;
    await admin.from('messages').insert({
      group_id: group.id,
      author_id: userId,
      author_name: 'Tester',
      text: messageText,
    });

    await gotoGroupPage(page, group);
    await expect(page.getByText(messageText)).toBeVisible({ timeout: 20_000 });

    // Leave the room, then make every read this room needs fail. Anything that
    // still renders can only be coming from the cache.
    await page.getByTestId('suggestions-nav').click();
    await expect(page.getByTestId('message-editor')).toBeHidden();

    await page.route('**/rest/v1/messages**', (route) => route.abort());
    await page.route('**/rest/v1/groups**', (route) => route.abort());

    await page.getByRole('link', { name: group.name }).click();

    await expect(page.getByTestId('group-title')).toHaveText(group.name);
    await expect(page.getByText(messageText)).toBeVisible();
    await expect(page.getByTestId('error-state')).toBeHidden();

    await page.unroute('**/rest/v1/messages**');
    await page.unroute('**/rest/v1/groups**');
  });

  test('room state is persisted to IndexedDB for a cold start', async ({
    page,
  }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);
    const group = await seedTestGroup(admin, userId, {
      slug: `id${Date.now().toString(36).slice(-5)}`,
      name: 'Cache Persist',
    });

    const messageText = `Persisted message ${Date.now()}`;
    await admin.from('messages').insert({
      group_id: group.id,
      author_id: userId,
      author_name: 'Tester',
      text: messageText,
    });

    await gotoGroupPage(page, group);
    await expect(page.getByText(messageText)).toBeVisible({ timeout: 20_000 });

    await expect
      .poll(async () => readPersistedQueryHashes(page), { timeout: 15_000 })
      .toEqual(expect.arrayContaining([expect.stringContaining(group.id)]));

    const hashes = await readPersistedQueryHashes(page);
    expect(hashes.some((hash) => hash.startsWith('["messages"'))).toBe(true);
    // Auth and one-shot lookups must stay out of durable storage.
    expect(hashes.some((hash) => hash.startsWith('["pushEnabled"'))).toBe(false);
  });

  test('a message sent offline is queued and delivered on reconnect', async ({
    page,
  }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);
    const group = await seedTestGroup(admin, userId, {
      slug: `of${Date.now().toString(36).slice(-5)}`,
      name: 'Offline Queue',
    });

    await gotoGroupPage(page, group);
    await expect(page.getByTestId('message-editor')).toBeVisible({
      timeout: 15_000,
    });

    await page.context().setOffline(true);
    await expect(page.getByTestId('connection-status')).toHaveText('Offline');

    const messageText = `Queued offline ${Date.now()}`;
    await page.getByTestId('message-editor').click();
    await page.keyboard.type(messageText);
    // Exact — the room title button is "<name> options" and would also match.
    await page.getByRole('button', { name: 'Send', exact: true }).click();

    // Composer accepted it and the bubble is queued, not lost.
    await expect(page.getByTestId('message-pending')).toBeVisible();
    await expect(page.getByText(messageText)).toBeVisible();

    await page.context().setOffline(false);

    await expect(page.getByTestId('message-pending')).toBeHidden({
      timeout: 30_000,
    });
    await expect(page.getByTestId('connection-status')).toBeHidden({
      timeout: 30_000,
    });

    // Exactly one row — the client-generated id makes retries idempotent.
    await expect
      .poll(
        async () => {
          const { data } = await admin
            .from('messages')
            .select('id')
            .eq('group_id', group.id)
            .eq('text', messageText);
          return data?.length ?? 0;
        },
        { timeout: 30_000 }
      )
      .toBe(1);
  });

  test('messages that arrive while disconnected appear after resume', async ({
    page,
  }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);
    const group = await seedTestGroup(admin, userId, {
      slug: `rs${Date.now().toString(36).slice(-5)}`,
      name: 'Resume Sync',
    });

    await gotoGroupPage(page, group);
    await expect(page.getByTestId('message-editor')).toBeVisible({
      timeout: 15_000,
    });

    // Killing the network kills the Realtime socket, so this insert can never be
    // delivered as an event — recovery has to come from the resume path.
    await page.context().setOffline(true);
    await expect(page.getByTestId('connection-status')).toHaveText('Offline');

    const missedText = `Missed while away ${Date.now()}`;
    await admin.from('messages').insert({
      group_id: group.id,
      author_id: userId,
      author_name: 'Tester',
      text: missedText,
    });

    await page.context().setOffline(false);

    await expect(page.getByText(missedText)).toBeVisible({ timeout: 30_000 });
  });

  test('a push delivers its message without a network round-trip', async ({
    page,
  }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);
    const group = await seedTestGroup(admin, userId, {
      slug: `pu${Date.now().toString(36).slice(-5)}`,
      name: 'Push Merge',
    });

    await gotoGroupPage(page, group);
    // The empty state proves the message query resolved, so the room has a cache
    // for the push to merge into. Going offline first would leave it unresolved.
    await expect(page.getByTestId('empty-state')).toBeVisible({
      timeout: 20_000,
    });

    await page.context().setOffline(true);

    const pushedText = `Pushed message ${Date.now()}`;
    const { data: inserted } = await admin
      .from('messages')
      .insert({
        group_id: group.id,
        author_id: userId,
        author_name: 'Tester',
        text: pushedText,
      })
      .select('id, created_at')
      .single();
    if (!inserted) throw new Error('Failed to insert pushed message');

    await dispatchServiceWorkerMessage(page, {
      type: 'yowl-push',
      title: group.name,
      body: `Tester: ${pushedText}`,
      url: `/${group.id}`,
      groupId: group.id,
      focused: false,
      message: {
        id: inserted.id,
        groupId: group.id,
        authorId: userId,
        authorName: 'Tester',
        authorPhotoURL: null,
        text: pushedText,
        createdAt: inserted.created_at,
        isAnnouncement: false,
      },
    });

    // Still offline: this can only have come from the push payload.
    await expect(page.getByText(pushedText)).toBeVisible();

    await page.context().setOffline(false);
  });

  test('logging out purges the durable cache', async ({ page }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);
    const group = await seedTestGroup(admin, userId, {
      slug: `lo${Date.now().toString(36).slice(-5)}`,
      name: 'Logout Purge',
    });

    const messageText = `Private message ${Date.now()}`;
    await admin.from('messages').insert({
      group_id: group.id,
      author_id: userId,
      author_name: 'Tester',
      text: messageText,
    });

    await gotoGroupPage(page, group);
    await expect(page.getByText(messageText)).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(async () => readPersistedQueryHashes(page), { timeout: 15_000 })
      .toEqual(expect.arrayContaining([expect.stringContaining(group.id)]));

    await page.getByTestId('user-menu-button').click();
    await page.getByRole('button', { name: 'Log out' }).click();

    // Cached rooms and messages must not survive to the next person on this
    // device.
    await expect
      .poll(async () => readPersistedQueryHashes(page), { timeout: 15_000 })
      .not.toEqual(
        expect.arrayContaining([expect.stringContaining(group.id)])
      );
  });

  test('a notification tap routes in-app without reloading the document', async ({
    page,
  }) => {
    const { admin, userId } = await seedAuthenticatedSession(page);
    const group = await seedTestGroup(admin, userId, {
      slug: `nt${Date.now().toString(36).slice(-5)}`,
      name: 'Notification Tap',
    });

    await gotoGroupPage(page, group);
    await page.getByTestId('suggestions-nav').click();
    await expect(page.getByTestId('message-editor')).toBeHidden();

    // A document reload would wipe this — and the warm cache with it.
    await page.evaluate(() => {
      (window as Window & { __yowlNoReload?: number }).__yowlNoReload = 1;
    });

    await dispatchServiceWorkerMessage(page, {
      type: 'yowl-navigate',
      url: `/${group.id}`,
    });

    await expect(page.getByTestId('group-title')).toHaveText(group.name);
    await expect(page.getByTestId('message-editor')).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as Window & { __yowlNoReload?: number }).__yowlNoReload
      )
    ).toBe(1);
  });
});

import { expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const getSupabaseEnv = () => {
  const url =
    process.env.VITE_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    'http://127.0.0.1:54321';
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  return { url, anonKey, serviceKey };
};

export const getAdminClient = () => {
  const { url, serviceKey } = getSupabaseEnv();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const storageKey = (url: string) =>
  `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;

export type TestGroup = {
  id: string;
  slug: string;
  name: string;
};

/** Wait until the browser session is authenticated (Header shows user menu). */
export const waitForAuthenticated = async (page: Page) => {
  await expect(page.getByTestId('user-menu-button')).toBeVisible({
    timeout: 15_000,
  });
};

/** E2E uses password sign-in (test-only); prod uses magic link. */
export const seedTestSession = async (page: Page) => {
  const { url, anonKey } = getSupabaseEnv();
  const admin = getAdminClient();
  const email = `e2e-${Date.now()}@quacker.test`;
  const password = 'QuackerE2ETest99!';

  const { data: userData, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !userData.user) throw error ?? new Error('No user');

  const client = createClient(url, anonKey);
  const { data: sessionData, error: signInError } =
    await client.auth.signInWithPassword({ email, password });
  if (signInError || !sessionData.session) {
    throw signInError ?? new Error('No session');
  }

  await page.goto('/');
  await page.evaluate(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: storageKey(url), session: sessionData.session }
  );
  await page.reload();
  await waitForAuthenticated(page);

  return { admin, userId: userData.user.id, email };
};

/** Create a group and wait for the creator membership trigger to finish. */
export const seedTestGroup = async (
  admin: SupabaseClient,
  userId: string,
  data: { name: string; slug: string; authorName?: string }
): Promise<TestGroup> => {
  const { data: group, error } = await admin
    .from('groups')
    .insert({
      slug: data.slug,
      creator_id: userId,
      name: data.name,
      author_name: data.authorName ?? 'Tester',
    })
    .select('id, slug, name')
    .single();

  if (error || !group) throw error ?? new Error('Failed to create group');

  await expect
    .poll(
      async () => {
        const { data: member } = await admin
          .from('group_members')
          .select('user_id')
          .eq('group_id', group.id)
          .eq('user_id', userId)
          .maybeSingle();
        return member?.user_id ?? null;
      },
      { timeout: 10_000 }
    )
    .toBe(userId);

  return group;
};

/** Navigate to a group and wait for the page shell to render. */
export const gotoGroupPage = async (
  page: Page,
  group: Pick<TestGroup, 'id' | 'name'>
) => {
  await page.goto(`/${group.id}`);
  await expect(page.getByTestId('route-loading')).toBeHidden({
    timeout: 15_000,
  });
  await expect
    .poll(
      async () => page.getByTestId('group-title').textContent(),
      { timeout: 20_000 }
    )
    .toBe(group.name);
};

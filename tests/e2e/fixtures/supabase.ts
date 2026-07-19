import { expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const demoAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const demoServiceRoleKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const isJwtKey = (key: string) => key.startsWith('eyJ');

const getSupabaseEnv = () => {
  const url =
    process.env.VITE_SUPABASE_URL ??
    process.env.API_URL ??
    process.env.SUPABASE_URL ??
    'http://127.0.0.1:54321';
  const anonCandidate =
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.ANON_KEY ?? demoAnonKey;
  const serviceCandidate =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SERVICE_ROLE_KEY ??
    demoServiceRoleKey;

  return {
    url,
    // Local Supabase CLI may export opaque sb_* keys; supabase-js admin APIs need JWTs.
    anonKey: isJwtKey(anonCandidate) ? anonCandidate : demoAnonKey,
    serviceKey: isJwtKey(serviceCandidate) ? serviceCandidate : demoServiceRoleKey,
  };
};

export const getAdminClient = () => {
  const { url, serviceKey } = getSupabaseEnv();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

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

const authStorageKey = (supabaseUrl: string) => {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.replace(/\./g, '-')}-auth-token`;
};

const pollOtpFromInbucket = async (email: string, timeoutMs = 15_000) => {
  const mailbox = encodeURIComponent(email.split('@')[0] ?? email);
  const base = process.env.INBUCKET_URL ?? 'http://127.0.0.1:54324';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const msgRes = await fetch(`${base}/api/v1/mailbox/${mailbox}/latest`);
    if (msgRes.ok) {
      const body = await msgRes.text();
      const match = body.match(/\b(\d{6})\b/);
      if (match?.[1]) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return null;
};

const injectSession = async (
  page: Page,
  email: string,
  appOrigin: string
) => {
  const { url, anonKey, serviceKey } = getSupabaseEnv();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
  const otp = linkData?.properties?.email_otp;
  if (linkError || !otp) {
    throw linkError ?? new Error('No OTP from admin generateLink');
  }

  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  });
  if (verifyError || !verifyData.session) {
    throw verifyError ?? new Error('Failed to verify admin OTP');
  }

  const storageKey = authStorageKey(url);
  await page.goto(`${appOrigin}/`);
  await page.evaluate(
    ({ key, session }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type,
          user: session.user,
        })
      );
    },
    { key: storageKey, session: verifyData.session }
  );
  await page.reload();
};

/** E2E uses admin-generated OTP; prod uses email OTP UI. */
export const seedTestSession = async (page: Page) => {
  const admin = getAdminClient();
  const email = `e2e-${Date.now()}@quacker.test`;
  const appOrigin =
    process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';

  const { data: userData, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !userData.user) throw error ?? new Error('No user');

  await page.goto(`${appOrigin}/`);
  await expect(page.getByTestId('sign-in-screen')).toBeVisible();
  await page.getByTestId('sign-in-email').fill(email);
  await page.getByTestId('sign-in-send-code').click();
  await expect(page.getByText('Check your email for a 6-digit code')).toBeVisible();

  const otp = await pollOtpFromInbucket(email);
  if (otp) {
    await page.getByTestId('sign-in-otp').fill(otp);
    await page.getByTestId('sign-in-verify').click();
  } else {
    await injectSession(page, email, appOrigin);
  }

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

import { createClient } from '@supabase/supabase-js';

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

/** E2E uses password sign-in (test-only); prod uses magic link. */
export const seedTestSession = async (page: import('@playwright/test').Page) => {
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

  return { admin, userId: userData.user.id, email };
};

const defaultUrl = 'http://127.0.0.1:54321';
const defaultAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export default async function globalSetup() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? defaultUrl;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? defaultAnonKey;

  const healthUrl = `${url.replace(/\/$/, '')}/auth/v1/health`;
  const res = await fetch(healthUrl, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });

  if (!res.ok) {
    throw new Error(
      `Supabase is not reachable at ${url} (status ${res.status}). Start it with "supabase start" before running integration e2e.`
    );
  }
}

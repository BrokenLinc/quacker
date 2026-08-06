/**
 * Proxy suggestion-export so GitHub issue links share the app origin
 * (Preview → quacker-dev; Production → prod) and inject the publishable key.
 */
export default async function handler(
  request: Request
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey) {
    return json({ error: 'misconfigured' }, 503);
  }

  const inbound = new URL(request.url);
  const id = inbound.searchParams.get('id')?.trim();
  if (!id) {
    return json({ error: 'id_required' }, 400);
  }

  const upstream = `${supabaseUrl}/functions/v1/suggestion-export?id=${encodeURIComponent(id)}`;
  try {
    const res = await fetch(upstream, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('suggestion-export proxy', err);
    return json({ error: 'upstream_failed' }, 502);
  }
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  };
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

export const config = {
  runtime: 'edge',
};

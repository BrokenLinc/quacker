const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const LABEL = 'user-suggestion';

type SuggestionRecord = {
  id: string;
  title: string;
  body: string;
};

async function ensureLabel(
  repo: string,
  token: string
): Promise<void> {
  const getRes = await fetch(
    `https://api.github.com/repos/${repo}/labels/${encodeURIComponent(LABEL)}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'yowl-suggestion-github-issue',
      },
    }
  );
  if (getRes.ok) return;
  if (getRes.status !== 404) {
    const text = await getRes.text();
    throw new Error(`label lookup failed: ${getRes.status} ${text}`);
  }

  const createRes = await fetch(`https://api.github.com/repos/${repo}/labels`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'yowl-suggestion-github-issue',
    },
    body: JSON.stringify({
      name: LABEL,
      color: '7057ff',
      description: 'User-submitted product suggestion from Yowl',
    }),
  });
  if (!createRes.ok && createRes.status !== 422) {
    const text = await createRes.text();
    throw new Error(`label create failed: ${createRes.status} ${text}`);
  }
}

/** Webhook secret (DB trigger) or SuperAdmin session JWT. */
async function authorizeRequest(req: Request): Promise<Response | null> {
  const webhookSecret = Deno.env.get('SUGGESTION_GITHUB_WEBHOOK_SECRET');
  const provided = req.headers.get('x-webhook-secret');

  if (provided != null && provided !== '') {
    if (!webhookSecret) {
      console.error('SUGGESTION_GITHUB_WEBHOOK_SECRET unset — refusing webhook');
      return new Response(JSON.stringify({ error: 'misconfigured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (provided !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return null;
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'misconfigured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Edge has no persisted Auth session — pass the JWT explicitly. Setting
  // Authorization via global headers alone is not enough for getUser().
  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(jwt);
  if (userError || !user) {
    console.error('suggestion-github-issue getUser', userError?.message);
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: isAdmin, error: adminError } = await admin.rpc(
    'is_user_superadmin',
    { uid: user.id }
  );
  if (adminError || !isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authError = await authorizeRequest(req);
    if (authError) return authError;

    const token = Deno.env.get('GITHUB_TOKEN');
    if (!token) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no-token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const repo = Deno.env.get('GITHUB_REPO') || 'BrokenLinc/quacker';
    const publicAppUrl = (
      Deno.env.get('PUBLIC_APP_URL') || 'https://yowl.us'
    ).replace(/\/$/, '');

    const payload = await req.json();
    const record = (payload.record ?? payload) as SuggestionRecord;
    if (!record?.id || !record?.title) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no-record' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await ensureLabel(repo, token);

    const exportUrl = `${publicAppUrl}/api/suggestion-export?id=${record.id}`;

    const issueBody = [
      record.body?.trim() || '',
      '',
      '---',
      '',
      `**Suggestion:** ${publicAppUrl}/suggestions/${record.id}`,
      `**Export JSON:** ${exportUrl}`,
    ]
      .join('\n')
      .trim();

    const createRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'yowl-suggestion-github-issue',
      },
      body: JSON.stringify({
        title: record.title,
        body: issueBody,
        labels: [LABEL],
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      console.error('github create issue', createRes.status, text);
      return new Response(
        JSON.stringify({ error: 'github_failed', status: createRes.status }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const issue = (await createRes.json()) as {
      number?: number;
      html_url?: string;
    };
    return new Response(
      JSON.stringify({
        ok: true,
        number: issue.number,
        url: issue.html_url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('suggestion-github-issue', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

import {
  corsHeaders,
  formatError,
  jsonResponse,
  normalizePhone,
  twilioAuthHeader,
  verifyServiceSid,
} from '../_shared/auth-utils.ts';

const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

const getAdminClient = () =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

const hashRateLimitKey = async (value: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
};

const isWithinRateLimit = async (
  identifier: string,
  maxAttempts: number
): Promise<boolean> => {
  const { data, error } = await getAdminClient().rpc(
    'check_auth_otp_rate_limit',
    {
      p_identifier: await hashRateLimitKey(identifier),
      p_max_attempts: maxAttempts,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    }
  );
  if (error) throw error;
  return data === true;
};

const canSendOtp = async (req: Request, phone: string): Promise<boolean> => {
  const clientIp = req.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();

  if (clientIp && !(await isWithinRateLimit(`ip:${clientIp}`, 20))) {
    return false;
  }
  return isWithinRateLimit(`phone:${phone}`, 5);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { phone: rawPhone } = await req.json();
    const phone = normalizePhone(String(rawPhone ?? ''));
    if (!phone) {
      return jsonResponse({ error: 'Invalid phone number' }, 400);
    }
    if (!(await canSendOtp(req, phone))) {
      return jsonResponse(
        { error: 'Too many verification requests. Try again later.' },
        429
      );
    }

    const serviceSid = verifyServiceSid();
    const body = new URLSearchParams({ To: phone, Channel: 'sms' });
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: twilioAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }
    );

    const payload = await res.json();
    if (!res.ok) {
      console.error('Twilio send error', payload);
      return jsonResponse(
        { error: payload.message ?? 'Failed to send code' },
        res.status
      );
    }

    return jsonResponse({
      ok: true,
      status: payload.status,
      verification_sid: payload.sid,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: formatError(e) }, 500);
  }
});

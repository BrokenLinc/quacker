import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

import {
  corsHeaders,
  formatError,
  isTestPhone,
  jsonResponse,
  logAuthOtp,
  maskPhone,
  normalizePhone,
  summarizeTwilioVerification,
  syntheticVerificationSid,
  testOtpEnabled,
  twilioAuthHeader,
  twilioSendOtpUserError,
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

const assertNotLockdownBlocked = async (phone: string) => {
  const admin = getAdminClient();
  const { data: lockdown, error } = await admin.rpc('get_site_lockdown');
  if (error) throw error;
  if (!lockdown) return;
  const { data: isAdmin, error: adminErr } = await admin.rpc(
    'is_superadmin_phone',
    { p_phone: phone }
  );
  if (adminErr) throw adminErr;
  if (!isAdmin) {
    throw Object.assign(new Error('Yowl is temporarily offline.'), {
      code: 'SITE_LOCKDOWN',
    });
  }
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

    try {
      await assertNotLockdownBlocked(phone);
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'SITE_LOCKDOWN'
      ) {
        return jsonResponse(
          {
            error: 'Yowl is temporarily offline. We\'re working on it!',
            code: 'SITE_LOCKDOWN',
          },
          503
        );
      }
      throw e;
    }

    // Local/dev test OTP — never enable AUTH_ALLOW_TEST_OTP in prod secrets.
    if (testOtpEnabled() && isTestPhone(phone)) {
      logAuthOtp('send_test', { phone: maskPhone(phone) });
      return jsonResponse({
        ok: true,
        status: 'pending',
        verification_sid: syntheticVerificationSid(),
        to: phone,
      });
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
      logAuthOtp(
        'send_failed',
        {
          http_status: res.status,
          phone: maskPhone(phone),
          service_sid: serviceSid,
          ...summarizeTwilioVerification(payload),
        },
        'error'
      );
      return jsonResponse(
        { error: twilioSendOtpUserError(payload) },
        res.status
      );
    }

    logAuthOtp('send_ok', {
      http_status: res.status,
      phone: maskPhone(String(payload.to ?? phone)),
      service_sid: serviceSid,
      verification_sid: payload.sid ?? null,
      status: payload.status ?? null,
      channel: payload.channel ?? null,
    });

    return jsonResponse({
      ok: true,
      status: payload.status,
      verification_sid: payload.sid,
      to: payload.to ?? phone,
    });
  } catch (e) {
    logAuthOtp('send_exception', { error: formatError(e) }, 'error');
    return jsonResponse({ error: formatError(e) }, 500);
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';
import type { User } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

import {
  corsHeaders,
  displayNameFromPhone,
  formatError,
  isVerificationSid,
  jsonResponse,
  logAuthOtp,
  maskPhone,
  normalizePhone,
  phonesMatch,
  summarizeTwilioVerification,
  syntheticEmail,
  twilioAuthHeader,
  verifyServiceSid,
} from '../_shared/auth-utils.ts';

const getAdminClient = () =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

/**
 * Find an existing SMS user by phone digits or synthetic email.
 * GoTrue often stores `phone` without a leading `+`, so exact-string
 * match against E.164 fails on the second login and createUser then
 * errors with "already registered".
 */
const findPhoneUser = async (
  admin: ReturnType<typeof getAdminClient>,
  phone: string
): Promise<User | null> => {
  const email = syntheticEmail(phone);
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const match = data.users.find(
      (u) => phonesMatch(u.phone, phone) || u.email === email
    );
    if (match) return match;
    if (data.users.length < 1000) break;
  }
  return null;
};

const ensurePhoneUser = async (
  admin: ReturnType<typeof getAdminClient>,
  phone: string
): Promise<User> => {
  const email = syntheticEmail(phone);
  const existing = await findPhoneUser(admin, phone);
  if (existing) {
    // Normalize stored phone to E.164 when GoTrue stripped the `+`.
    if (existing.phone !== phone) {
      const { data: updated, error: updateError } =
        await admin.auth.admin.updateUserById(existing.id, {
          phone,
          phone_confirm: true,
        });
      if (!updateError && updated.user) return updated.user;
    }
    return existing;
  }

  const { data, error } = await admin.auth.admin.createUser({
    phone,
    phone_confirm: true,
    email,
    email_confirm: true,
    user_metadata: { display_name: displayNameFromPhone(phone) },
  });

  if (error) {
    // Race or format mismatch — treat duplicate as sign-in.
    const retry = await findPhoneUser(admin, phone);
    if (retry) return retry;
    throw error;
  }

  if (!data.user) throw new Error('Failed to create user');
  return data.user;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { phone: rawPhone, code, verification_sid: rawVerificationSid } =
      await req.json();
    const phone = normalizePhone(String(rawPhone ?? ''));
    const otp = String(code ?? '').trim();
    const verificationSid = String(rawVerificationSid ?? '').trim();
    const hasValidVerificationSid = isVerificationSid(verificationSid);

    if (!hasValidVerificationSid && !phone) {
      return jsonResponse({ error: 'Invalid phone number' }, 400);
    }
    if (!/^\d{4,10}$/.test(otp)) {
      return jsonResponse({ error: 'Invalid code' }, 400);
    }

    const serviceSid = verifyServiceSid();
    const checkBody = new URLSearchParams({ Code: otp });
    if (phone) {
      checkBody.set('To', phone);
    }
    if (hasValidVerificationSid) {
      checkBody.set('VerificationSid', verificationSid);
    }

    logAuthOtp('verify_request', {
      phone: maskPhone(phone),
      code_length: otp.length,
      verification_sid: hasValidVerificationSid ? verificationSid : null,
      verification_sid_valid: hasValidVerificationSid,
      check_includes_to: Boolean(phone),
      check_includes_verification_sid: hasValidVerificationSid,
      service_sid: serviceSid,
    });

    const checkRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: twilioAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: checkBody,
      }
    );

    const checkPayload = await checkRes.json();
    const twilioSummary = summarizeTwilioVerification(checkPayload);

    if (!checkRes.ok) {
      logAuthOtp(
        'verify_twilio_error',
        {
          http_status: checkRes.status,
          phone: maskPhone(phone),
          request_verification_sid: hasValidVerificationSid
            ? verificationSid
            : null,
          service_sid: serviceSid,
          ...twilioSummary,
        },
        'error'
      );
      const status =
        checkRes.status === 404 ? 401 : checkRes.status >= 500 ? 500 : 400;
      return jsonResponse(
        {
          error:
            checkRes.status === 404
              ? 'Code expired or too many attempts. Text yourself a new code.'
              : (checkPayload.message ?? 'Verification failed'),
        },
        status
      );
    }

    if (checkPayload.status !== 'approved') {
      logAuthOtp(
        'verify_not_approved',
        {
          http_status: checkRes.status,
          phone: maskPhone(String(checkPayload.to ?? phone)),
          request_verification_sid: hasValidVerificationSid
            ? verificationSid
            : null,
          response_verification_sid: checkPayload.sid ?? null,
          service_sid: serviceSid,
          ...twilioSummary,
        },
        'error'
      );
      return jsonResponse(
        {
          error:
            'Incorrect code. Use the latest text message or request a new code.',
        },
        401
      );
    }

    const verifiedPhone = normalizePhone(String(checkPayload.to ?? phone ?? ''));
    if (!verifiedPhone) {
      return jsonResponse({ error: 'Invalid phone number' }, 400);
    }

    logAuthOtp('verify_ok', {
      phone: maskPhone(String(checkPayload.to ?? phone)),
      verification_sid: checkPayload.sid ?? verificationSid,
      service_sid: serviceSid,
      status: checkPayload.status,
      valid: checkPayload.valid ?? null,
    });

    const admin = getAdminClient();
    const user = await ensurePhoneUser(admin, verifiedPhone);
    const email = user.email ?? syntheticEmail(verifiedPhone);

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

    if (linkError || !linkData.properties?.hashed_token) {
      logAuthOtp(
        'session_create_failed',
        {
          phone: maskPhone(verifiedPhone),
          verification_sid: checkPayload.sid ?? verificationSid,
          error: formatError(linkError),
        },
        'error'
      );
      return jsonResponse({ error: 'Failed to create session' }, 500);
    }

    return jsonResponse({ token_hash: linkData.properties.hashed_token });
  } catch (e) {
    logAuthOtp('verify_exception', { error: formatError(e) }, 'error');
    return jsonResponse({ error: formatError(e) }, 500);
  }
});

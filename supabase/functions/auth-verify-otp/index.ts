import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';
import type { User } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

import {
  corsHeaders,
  displayNameFromPhone,
  formatError,
  jsonResponse,
  normalizePhone,
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

const findUserByPhone = async (
  admin: ReturnType<typeof getAdminClient>,
  phone: string
): Promise<User | null> => {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const match = data.users.find((u) => u.phone === phone);
    if (match) return match;
    if (data.users.length < 1000) break;
  }
  return null;
};

const ensurePhoneUser = async (
  admin: ReturnType<typeof getAdminClient>,
  phone: string
): Promise<User> => {
  const existing = await findUserByPhone(admin, phone);
  if (existing) return existing;

  const email = syntheticEmail(phone);
  const { data, error } = await admin.auth.admin.createUser({
    phone,
    phone_confirm: true,
    email,
    email_confirm: true,
    user_metadata: { display_name: displayNameFromPhone(phone) },
  });

  if (error) {
    const retry = await findUserByPhone(admin, phone);
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

    if (!verificationSid && !phone) {
      return jsonResponse({ error: 'Invalid phone number' }, 400);
    }
    if (!/^\d{4,10}$/.test(otp)) {
      return jsonResponse({ error: 'Invalid code' }, 400);
    }

    const serviceSid = verifyServiceSid();
    const checkBody = new URLSearchParams({ Code: otp });
    if (verificationSid) {
      checkBody.set('VerificationSid', verificationSid);
    } else if (phone) {
      checkBody.set('To', phone);
    }
    const checkRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationChecks`,
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
    if (!checkRes.ok) {
      console.error('Twilio verify error', checkPayload);
      const status =
        checkRes.status === 404 ? 401 : checkRes.status >= 500 ? 500 : 400;
      return jsonResponse(
        {
          error:
            checkRes.status === 404
              ? 'Invalid or expired code'
              : (checkPayload.message ?? 'Verification failed'),
        },
        status
      );
    }

    if (checkPayload.status !== 'approved') {
      return jsonResponse({ error: 'Invalid or expired code' }, 401);
    }

    const verifiedPhone = normalizePhone(String(checkPayload.to ?? phone ?? ''));
    if (!verifiedPhone) {
      return jsonResponse({ error: 'Invalid phone number' }, 400);
    }

    const admin = getAdminClient();
    const user = await ensurePhoneUser(admin, verifiedPhone);
    const email = user.email ?? syntheticEmail(verifiedPhone);

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error('generateLink error', linkError);
      return jsonResponse({ error: 'Failed to create session' }, 500);
    }

    return jsonResponse({ token_hash: linkData.properties.hashed_token });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: formatError(e) }, 500);
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';
import type { User } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

import {
  corsHeaders,
  displayNameFromPhone,
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
  for (let page = 1; page <= 5; page++) {
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
    const { phone: rawPhone, code } = await req.json();
    const phone = normalizePhone(String(rawPhone ?? ''));
    const otp = String(code ?? '').trim();

    if (!phone) {
      return jsonResponse({ error: 'Invalid phone number' }, 400);
    }
    if (!/^\d{4,10}$/.test(otp)) {
      return jsonResponse({ error: 'Invalid code' }, 400);
    }

    const serviceSid = verifyServiceSid();
    const checkBody = new URLSearchParams({ To: phone, Code: otp });
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
      return jsonResponse(
        { error: checkPayload.message ?? 'Verification failed' },
        checkRes.status
      );
    }

    if (checkPayload.status !== 'approved') {
      return jsonResponse({ error: 'Invalid or expired code' }, 401);
    }

    const admin = getAdminClient();
    const user = await ensurePhoneUser(admin, phone);
    const email = user.email ?? syntheticEmail(phone);

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
    return jsonResponse({ error: String(e) }, 500);
  }
});

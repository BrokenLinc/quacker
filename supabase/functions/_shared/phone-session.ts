import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';
import type { User } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

import {
  displayNameFromPhone,
  formatError,
  jsonResponse,
  logAuthOtp,
  maskPhone,
  phonesMatch,
  syntheticEmail,
} from './auth-utils.ts';

export type AdminClient = ReturnType<typeof createAdminClient>;

export const createAdminClient = () =>
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
export const findPhoneUser = async (
  admin: AdminClient,
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

export const ensurePhoneUser = async (
  admin: AdminClient,
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

/** Ensure phone user exists and return a magiclink token_hash for the client. */
export const issuePhoneSession = async (
  admin: AdminClient,
  phone: string,
  logContext: Record<string, unknown> = {}
): Promise<Response> => {
  const user = await ensurePhoneUser(admin, phone);
  const email = user.email ?? syntheticEmail(phone);

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

  if (linkError || !linkData.properties?.hashed_token) {
    logAuthOtp(
      'session_create_failed',
      {
        phone: maskPhone(phone),
        error: formatError(linkError),
        ...logContext,
      },
      'error'
    );
    return jsonResponse({ error: 'Failed to create session' }, 500);
  }

  return jsonResponse({ token_hash: linkData.properties.hashed_token });
};

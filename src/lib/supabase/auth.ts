import { useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from './client';

const SYNTHETIC_EMAIL_DOMAIN = '@phone.yowl.us';

/** App-facing user shape (compatible with legacy Firebase fields). */
export interface AppUser {
  uid: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const isSyntheticEmail = (email: string | null | undefined) =>
  Boolean(email?.endsWith(SYNTHETIC_EMAIL_DOMAIN));

export const displayNameFromPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return `···${digits.slice(-4)}`;
};

/** Last 4 phone digits for roster chrome; null when phone is missing/short. */
export const phoneLast4FromPhone = (
  phone: string | null | undefined
): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return digits.slice(-4);
};

export const toAppUser = (user: User | null): AppUser | null => {
  if (!user) return null;
  const phone = user.phone ?? null;
  const email = isSyntheticEmail(user.email) ? null : (user.email ?? null);
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    (phone ? displayNameFromPhone(phone) : email ? email.split('@')[0] : null);
  return {
    uid: user.id,
    email,
    phone,
    displayName,
    photoURL: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };
};

export const resolveAppUserPhotoURL = (
  user: Pick<AppUser, 'photoURL'>
): string | null => user.photoURL ?? null;

/** Phone-seeded fallback like `···1234` — not a chosen identity. */
export const isPhoneFallbackDisplayName = (
  name: string | null | undefined
): boolean => Boolean(name && /^···\d{4}$/.test(name));

/** True when the user picked a real name (vs the `···1234` phone fallback). */
export const hasChosenDisplayName = (user: User | null): boolean => {
  const name = user?.user_metadata?.display_name as string | undefined;
  return Boolean(name) && !isPhoneFallbackDisplayName(name);
};

/** AppUser variant — uses resolved `displayName` (metadata or phone fallback). */
export const appUserHasChosenDisplayName = (user: AppUser | null): boolean => {
  if (!user?.displayName) return false;
  return !isPhoneFallbackDisplayName(user.displayName);
};

/**
 * Reserved fictional number for manual/dev FTUE checks.
 * Dev Edge Functions delete any existing auth user with this phone before
 * issuing a session, so every login is a fresh “needs name” signup.
 * Format: (202) 555-0199 — never use for Maestro shared login (0100).
 */
export const FTUE_TEST_PHONE_E164 = '+12025550199';
export const FTUE_TEST_PHONE_DISPLAY = '(202) 555-0199';


export const updateDisplayName = async (displayName: string) => {
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName.trim() },
  });
  if (error) throw error;
};

export const getCurrentAuthUser = async (): Promise<User | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
};

export const signOut = () => supabase.auth.signOut();

const formatUnknownError = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (typeof value === 'object' && value !== null && 'message' in value) {
    return String((value as { message: unknown }).message);
  }
  return String(value);
};

const getFunctionError = async (
  data: { error?: unknown } | null,
  error: Error | null
): Promise<Error | null> => {
  if (data?.error) return new Error(formatUnknownError(data.error));
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: unknown };
      if (body.error) return new Error(formatUnknownError(body.error));
    } catch {
      // Preserve the invoke error when the response body is not valid JSON.
    }
  }
  return error;
};

export const normalizePhoneInput = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^\+[1-9]\d{6,14}$/.test(trimmed.replace(/\s/g, ''))) {
    return trimmed.replace(/\s/g, '');
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
};

/** Digits-only phone for comparisons (GoTrue may omit leading `+`). */
export const phoneDigits = (
  phone: string | null | undefined
): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length ? digits : null;
};

/** Hard-coded SuperAdmin phones (digits, with country code). */
const SUPERADMIN_PHONE_DIGITS = new Set(['13522622098']);

/** True when the phone matches a SuperAdmin (digit-normalized). */
export const isSuperAdminPhone = (
  phone: string | null | undefined
): boolean => {
  const digits = phoneDigits(phone);
  return Boolean(digits && SUPERADMIN_PHONE_DIGITS.has(digits));
};

export const requestSmsOtp = async (phone: string) => {
  const { data, error } = await supabase.functions.invoke('auth-send-otp', {
    body: { phone },
  });
  const functionError = await getFunctionError(data, error);
  if (functionError) return { error: functionError, verificationSid: null };
  const verificationSid =
    typeof data?.verification_sid === 'string' ? data.verification_sid : null;
  if (!verificationSid) {
    return {
      error: new Error('No verification id returned'),
      verificationSid: null,
    };
  }
  return { error: null, verificationSid };
};

export const verifySmsOtp = async (
  phone: string,
  code: string,
  verificationSid: string
) => {
  const { data, error } = await supabase.functions.invoke('auth-verify-otp', {
    body: { phone, code, verification_sid: verificationSid },
  });
  const functionError = await getFunctionError(data, error);
  if (functionError) return { error: functionError };
  if (!data?.token_hash) {
    return { error: new Error('No session token returned') };
  }

  const { error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash as string,
    type: 'email',
  });
  return { error: sessionError };
};

export const useAuthState = (): [
  AppUser | null,
  boolean,
  Error | undefined,
] => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session }, error: sessionError }) => {
        if (sessionError) setError(sessionError);
        setUser(toAppUser(session?.user ?? null));
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(toAppUser(session?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return [user, loading, error];
};

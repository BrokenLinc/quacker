import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { resolvePhotoURL } from '@@lib/gravatar';

import { supabase } from './client';

const SYNTHETIC_EMAIL_DOMAIN = '@phone.hork.us';

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
  user: Pick<AppUser, 'photoURL' | 'email'>
) => resolvePhotoURL(user.photoURL, user.email);

export const signOut = () => supabase.auth.signOut();

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

export const requestSmsOtp = async (phone: string) => {
  const { data, error } = await supabase.functions.invoke('auth-send-otp', {
    body: { phone },
  });
  if (error) return { error };
  if (data?.error) return { error: new Error(String(data.error)) };
  return { error: null };
};

export const verifySmsOtp = async (phone: string, code: string) => {
  const { data, error } = await supabase.functions.invoke('auth-verify-otp', {
    body: { phone, code },
  });
  if (error) return { error };
  if (data?.error) return { error: new Error(String(data.error)) };
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

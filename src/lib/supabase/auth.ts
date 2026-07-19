import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { resolvePhotoURL } from '@@lib/gravatar';

import { supabase } from './client';

/** App-facing user shape (compatible with legacy Firebase fields). */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const toAppUser = (user: User | null): AppUser | null => {
  if (!user) return null;
  const email = user.email ?? null;
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    (email ? email.split('@')[0] : null);
  return {
    uid: user.id,
    email,
    displayName,
    photoURL: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };
};

export const resolveAppUserPhotoURL = (
  user: Pick<AppUser, 'photoURL' | 'email'>
) => resolvePhotoURL(user.photoURL, user.email);

export const signOut = () => supabase.auth.signOut();

export const signInWithMagicLink = (email: string) => {
  const redirectTo = `${window.location.origin}/auth/callback`;
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
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

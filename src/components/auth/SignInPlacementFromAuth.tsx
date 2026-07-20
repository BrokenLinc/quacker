import React from 'react';

import { useAuthState } from '@@lib/supabase/auth';

import { SignInPlacementProvider } from './SignInPlacementProvider';
import type { SignInPlacement } from './signInPlacementContext';

/** Sets placement from auth so Header (a sibling of RequireAuth) can hide its login button. */
export const SignInPlacementFromAuth: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, loading] = useAuthState();
  const value: SignInPlacement = !loading && !user ? 'inline' : 'header';
  return (
    <SignInPlacementProvider value={value}>{children}</SignInPlacementProvider>
  );
};

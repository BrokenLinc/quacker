import * as UI from '@@ui';
import React from 'react';

import { useAuthState } from '@@lib/supabase/auth';

import { SignInScreen } from './SignInScreen';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, loading, error] = useAuthState();

  if (loading) {
    return (
      <UI.Box
        minH="100dvh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <UI.Spinner data-testid="auth-loading" />
      </UI.Box>
    );
  }

  if (error) return null;
  if (!user) return <SignInScreen />;

  return <>{children}</>;
};

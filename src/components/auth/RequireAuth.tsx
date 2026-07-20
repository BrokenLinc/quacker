import * as UI from '@@ui';
import React from 'react';

import { useAuthState } from '@@lib/supabase/auth';

import { SignInScreen } from './SignInScreen';

export const RequireAuth: React.FC<{
  children: React.ReactNode;
  heading?: string;
}> = ({ children, heading }) => {
  const [user, loading, error] = useAuthState();

  if (loading) {
    return (
      <UI.Box maxW="480px" mx="auto" p={4}>
        <UI.Spinner />
      </UI.Box>
    );
  }
  if (error) return null;
  if (!user) return <SignInScreen heading={heading} />;

  return <>{children}</>;
};

import * as UI from '@@ui';
import React from 'react';

import { useAuthState } from '@@lib/supabase/auth';

import { SignInScreen } from './SignInScreen';

export const RequireAuth: React.FC<{
  children: React.ReactNode;
  heading?: string;
  /** When set, shown instead of the default skeleton while session resolves. */
  loadingFallback?: React.ReactNode;
}> = ({ children, heading, loadingFallback }) => {
  const [user, loading, error] = useAuthState();

  if (loading) {
    if (loadingFallback !== undefined) return <>{loadingFallback}</>;
    return (
      <UI.Box flex={1} overflowY="auto" maxW="480px" w="full" mx="auto" p={4}>
        <UI.VStack align="stretch" spacing={3}>
          <UI.Skeleton h={8} borderRadius="md" />
          <UI.Skeleton h={20} borderRadius="lg" />
          <UI.Skeleton h={20} borderRadius="lg" />
        </UI.VStack>
      </UI.Box>
    );
  }
  if (error) {
    return (
      <UI.Box flex={1} overflowY="auto">
        <UI.ErrorState
          title="Couldn't check your session"
          onRetry={() => window.location.reload()}
        />
      </UI.Box>
    );
  }
  if (!user) return <SignInScreen heading={heading} />;

  return <>{children}</>;
};

import * as UI from '@@ui';
import React from 'react';

import {
  appUserHasChosenDisplayName,
  useAuthState,
} from '@@lib/supabase/auth';

import { useFtueHold } from './ftueHoldContext';
import { PostAuthOnboarding } from './PostAuthOnboarding';
import { SignInScreen } from './SignInScreen';

export const RequireAuth: React.FC<{
  children: React.ReactNode;
  /** Invite-link sign-in copy (large logo + join heading). */
  invite?: boolean;
  heading?: string;
  /** When set, shown instead of the default skeleton while session resolves. */
  loadingFallback?: React.ReactNode;
}> = ({ children, invite = false, heading, loadingFallback }) => {
  const [user, loading, error] = useAuthState();
  const { ftueHold, endFtue } = useFtueHold();

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
  if (!user) {
    return <SignInScreen invite={invite} heading={heading} />;
  }

  // needsName covers first paint before AppLayout's ftueHold effect; ftueHold
  // keeps create-room mounted after the display name is saved.
  const needsName = !appUserHasChosenDisplayName(user);
  if (needsName || ftueHold) {
    return (
      <PostAuthOnboarding invite={invite} onComplete={endFtue} />
    );
  }

  return <>{children}</>;
};

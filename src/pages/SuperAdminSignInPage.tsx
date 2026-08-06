import { useSiteSettings } from '@@api';
import { SignInForm } from '@@components/auth/SignInForm';
import { useAuthState } from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import { Navigate } from 'react-router-dom';
import React from 'react';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

/**
 * Sole public OTP entry while the site is in lockdown. Always available so a
 * SuperAdmin can recover access; Edge Functions still reject non-admin phones.
 */
const SuperAdminSignInPage: React.FC = () => {
  const [user] = useAuthState();
  const [settings, loading] = useSiteSettings();

  if (user) {
    return <Navigate to={routes.home().path} replace />;
  }

  return (
    <UI.Box
      flex={1}
      minH={0}
      overflowY="auto"
      px={4}
      py={8}
      data-testid="superadmin-sign-in"
    >
      <UI.VStack spacing={6} maxW="360px" mx="auto" align="stretch">
        <UI.Image
          src="/yowl-logo.svg"
          alt="Yowl"
          h="40px"
          w="auto"
          alignSelf="center"
          data-testid="sign-in-logo"
        />
        <UI.Heading size="md" textAlign="center">
          SuperAdmin sign in
        </UI.Heading>
        {!loading && settings?.lockdown ? (
          <UI.Text fontSize="sm" color="text.muted" textAlign="center">
            Site lockdown is on. Only SuperAdmin accounts can sign in here.
          </UI.Text>
        ) : null}
        <SignInForm />
        {!loading && !settings?.lockdown ? (
          <UI.RouteButton route={routes.home()} variant="ghost" size="sm">
            Back to Yowl
          </UI.RouteButton>
        ) : (
          <UI.HStack justify="center" color="text.muted" spacing={2}>
            <UI.Icon icon={faTriangleExclamation} />
            <UI.Text fontSize="sm">Maintenance access only</UI.Text>
          </UI.HStack>
        )}
      </UI.VStack>
    </UI.Box>
  );
};

export default SuperAdminSignInPage;

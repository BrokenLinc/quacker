import * as UI from '@@ui';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@@lib/supabase/client';
import { routes } from '@@routing/routes';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) {
        navigate(routes.home().path, { replace: true });
      }
    };

    const code = new URLSearchParams(window.location.search).get('code');

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => finish());
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        finish();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <UI.Box p={8} textAlign="center">
      <UI.Spinner />
      <UI.Text mt={4}>Signing you in…</UI.Text>
    </UI.Box>
  );
};

export default AuthCallbackPage;

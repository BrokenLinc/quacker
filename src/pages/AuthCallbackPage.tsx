import * as UI from '@@ui';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@@lib/supabase/client';
import { routes } from '@@routing/routes';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? routes.home().path : routes.home().path, {
        replace: true,
      });
    });
  }, [navigate]);

  return (
    <UI.Box p={8} textAlign="center">
      <UI.Spinner />
      <UI.Text mt={4}>Signing you in…</UI.Text>
    </UI.Box>
  );
};

export default AuthCallbackPage;

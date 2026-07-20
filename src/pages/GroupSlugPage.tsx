import * as UI from '@@ui';
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useGroupBySlug } from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { SignInPlacementFromAuth } from '@@components/auth/SignInPlacementFromAuth';
import { Header } from '@@components/Header';
import { routes } from '@@routing/routes';

const GroupSlugPage: React.FC = () => {
  return (
    <SignInPlacementFromAuth>
      <Header />
      <RequireAuth heading="Sign in to join this group">
        <GroupSlugRedirect />
      </RequireAuth>
    </SignInPlacementFromAuth>
  );
};

const GroupSlugRedirect: React.FC = () => {
  const { slug } = useParams() as { slug: string };
  const navigate = useNavigate();
  const [group, loading, error] = useGroupBySlug(slug);

  useEffect(() => {
    if (group?.id) {
      navigate(routes.group(group.id).path, { replace: true });
    }
  }, [group, navigate]);

  if (loading) {
    return (
      <UI.Box p={8} textAlign="center">
        <UI.Spinner />
      </UI.Box>
    );
  }

  if (error || !group) {
    return (
      <UI.Box p={8} textAlign="center">
        <UI.Text>Group not found.</UI.Text>
      </UI.Box>
    );
  }

  return null;
};

export default GroupSlugPage;

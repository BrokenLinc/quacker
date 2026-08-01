import * as UI from '@@ui';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useGroupBySlug } from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { routes } from '@@routing/routes';

const GroupSlugPage: React.FC = () => {
  return (
    <RequireAuth invite heading="Sign in to join this room">
      <GroupSlugRedirect />
    </RequireAuth>
  );
};

const GroupSlugRedirect: React.FC = () => {
  const { slug } = useParams() as { slug: string };
  const navigate = useNavigate();
  const [group, loading] = useGroupBySlug(slug);

  useEffect(() => {
    if (group?.id) {
      navigate(routes.group(group.id).path, { replace: true });
    }
  }, [group, navigate]);

  if (loading || group) {
    return (
      <UI.Box flex={1} overflowY="auto" p={8} textAlign="center">
        <UI.Spinner />
      </UI.Box>
    );
  }

  return (
    <UI.Box flex={1} overflowY="auto">
      <UI.EmptyState
        icon={faComments}
        title="Room not found"
        description="This invite link may have expired, or the room was deleted."
        action={
          <UI.RouteButton route={routes.home()} variant="outline">
            Back home
          </UI.RouteButton>
        }
      />
    </UI.Box>
  );
};

export default GroupSlugPage;

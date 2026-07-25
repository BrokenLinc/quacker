import * as UI from '@@ui';
import { faCompass } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

import { routes } from '@@routing/routes';

const NotFoundPage: React.FC = () => {
  return (
    <UI.Box flex={1} overflowY="auto">
      <UI.EmptyState
        icon={faCompass}
        title="Page not found"
        description="That link doesn't go anywhere."
        action={
          <UI.RouteButton route={routes.home()} variant="outline">
            Back home
          </UI.RouteButton>
        }
      />
    </UI.Box>
  );
};

export default NotFoundPage;

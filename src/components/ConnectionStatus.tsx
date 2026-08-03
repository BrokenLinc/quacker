import * as UI from '@@ui';
import React from 'react';

import { useConnectionState } from '@@lib/lifecycle/useConnectionState';

/**
 * Quiet connectivity pill. Renders nothing when everything is live, so the room
 * chrome stays calm; messages typed while it is showing are queued, not lost.
 */
export const ConnectionStatus: React.FC = () => {
  const state = useConnectionState();

  if (state === 'online') return null;

  const offline = state === 'offline';

  return (
    <UI.Badge
      data-testid="connection-status"
      colorScheme={offline ? 'orange' : 'blue'}
      variant="subtle"
      fontSize="2xs"
      textTransform="none"
      borderRadius="full"
      px={2}
      py={0.5}
      flexShrink={0}
    >
      {offline ? 'Offline' : 'Reconnecting…'}
    </UI.Badge>
  );
};

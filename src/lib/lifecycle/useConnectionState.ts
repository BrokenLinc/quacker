import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import {
  getRealtimeHealth,
  subscribeRealtimeStatus,
  type RealtimeHealth,
} from '@@lib/realtime/manager';

export type ConnectionState = 'online' | 'offline' | 'reconnecting';

const subscribeOnline = (listener: () => void) => onlineManager.subscribe(listener);
const getOnline = () => onlineManager.isOnline();
const getOnlineServer = () => true;

const getHealth = (): RealtimeHealth => getRealtimeHealth();
const getHealthServer = (): RealtimeHealth => 'idle';

/**
 * Connectivity as the user experiences it: the browser being offline, or live
 * updates being broken while the network is technically up.
 *
 * `connecting` is deliberately not surfaced — every room entry passes through it
 * for a moment and a pill that blinks on each navigation is just noise.
 */
export const useConnectionState = (): ConnectionState => {
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnline,
    getOnlineServer
  );
  const health = useSyncExternalStore(
    subscribeRealtimeStatus,
    getHealth,
    getHealthServer
  );

  if (!online) return 'offline';
  if (health === 'degraded') return 'reconnecting';
  return 'online';
};

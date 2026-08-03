import { useEffect, useMemo, useSyncExternalStore } from 'react';

import {
  getOutboxSnapshot,
  loadOutbox,
  subscribeOutbox,
  type OutboxEntry,
} from './outbox';

/**
 * Queued (not yet acknowledged) messages for a room. Because the queue is
 * durable, pending bubbles survive navigating away and full reloads.
 */
export const useOutboxEntries = (groupId: string): OutboxEntry[] => {
  const all = useSyncExternalStore(
    subscribeOutbox,
    getOutboxSnapshot,
    getOutboxSnapshot
  );

  useEffect(() => {
    void loadOutbox();
  }, []);

  return useMemo(
    () => all.filter((entry) => entry.groupId === groupId),
    [all, groupId]
  );
};

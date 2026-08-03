import { useEffect, useRef } from 'react';

import { type RealtimeTopic, subscribeTopic } from './manager';

/**
 * Join a shared Realtime topic for the lifetime of the component. Pass `null`
 * to stay unsubscribed (e.g. before an id or session is known).
 *
 * Topics must be built by module-level factories that close over ids only, so
 * the handlers registered on the shared channel can never go stale.
 */
export const useRealtimeTopic = (topic: RealtimeTopic | null): void => {
  const topicRef = useRef(topic);
  topicRef.current = topic;
  const key = topic?.key ?? null;

  useEffect(() => {
    const current = topicRef.current;
    if (!key || !current) return;
    return subscribeTopic(current);
  }, [key]);
};

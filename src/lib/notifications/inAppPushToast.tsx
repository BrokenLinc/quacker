import * as UI from '@@ui';
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { invalidateUnreadCounts } from '@@api/cache';
import { resumeAppSync } from '@@lib/lifecycle/appLifecycle';

import { applyPushedMessage } from './pushInbox';

type PushPayload = {
  type: 'yowl-push';
  title: string;
  body: string;
  url: string;
  groupId: string | null;
  /** Full message row when the sender is new enough to include it. */
  message?: unknown;
  /** Whether this client was focused when the push arrived. */
  focused?: boolean;
};

type NavigatePayload = {
  type: 'yowl-navigate';
  url: string;
};

const isPushPayload = (data: unknown): data is PushPayload => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.type === 'yowl-push' && typeof d.title === 'string';
};

const isNavigatePayload = (data: unknown): data is NavigatePayload => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.type === 'yowl-navigate' && typeof d.url === 'string';
};

const pathMatchesGroup = (pathname: string, groupId: string): boolean =>
  pathname === `/${groupId}` || pathname.startsWith(`/${groupId}/`);

/**
 * Bridge between the service worker and the running app.
 *
 * - Every push is merged into the message cache, focused or not, so switching
 *   back to a backgrounded tab already shows what arrived.
 * - A toast appears only for a focused client looking at a different room.
 * - Notification taps arrive as `yowl-navigate` and route in-app instead of
 *   reloading the document, which is what used to lose the warm cache.
 */
export const InAppPushToastListener: React.FC = () => {
  const toast = UI.useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = React.useRef(location.pathname);
  pathnameRef.current = location.pathname;
  const navigateRef = React.useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw?.addEventListener) return;

    const onMessage = (event: MessageEvent) => {
      if (isNavigatePayload(event.data)) {
        navigateRef.current(event.data.url);
        // The socket is usually dead after a background stint — recover before
        // the room renders so it is not showing a stale thread.
        resumeAppSync();
        event.ports?.[0]?.postMessage({ ok: true });
        return;
      }

      if (!isPushPayload(event.data)) return;
      const { title, body, url, groupId, message, focused } = event.data;

      if (applyPushedMessage(message)) {
        invalidateUnreadCounts();
      }

      const viewingGroup = Boolean(
        groupId && pathMatchesGroup(pathnameRef.current, groupId)
      );
      // Unfocused clients merged the message above; a toast they cannot see
      // would only pile up behind the OS notification.
      if (focused === false || viewingGroup) return;

      const toastId = groupId ? `yowl-group-${groupId}` : 'yowl-push';

      toast({
        id: toastId,
        status: 'info',
        duration: 6000,
        isClosable: true,
        position: 'top',
        render: ({ onClose }) => (
          <UI.Box
            as="button"
            type="button"
            onClick={() => {
              onClose();
              navigate(url);
              // Same recovery as `yowl-navigate` — toast taps can follow a
              // background stint where the socket is already dead.
              resumeAppSync();
            }}
            textAlign="left"
            w="100%"
            maxW="sm"
            px={4}
            py={3}
            borderRadius="md"
            bg="surface.raised"
            borderWidth="1px"
            borderColor="border.subtle"
            boxShadow="md"
            cursor="pointer"
            _hover={{ bg: 'surface.sunken' }}
          >
            <UI.Text fontWeight="bold" fontSize="sm" noOfLines={1}>
              {title}
            </UI.Text>
            <UI.Text fontSize="sm" color="text.muted" noOfLines={2} mt={0.5}>
              {body}
            </UI.Text>
          </UI.Box>
        ),
      });
    };

    sw.addEventListener('message', onMessage);
    return () => {
      sw.removeEventListener?.('message', onMessage);
    };
  }, [navigate, toast]);

  return null;
};

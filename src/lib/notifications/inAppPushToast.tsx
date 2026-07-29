import * as UI from '@@ui';
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type PushPayload = {
  type: 'yowl-push';
  title: string;
  body: string;
  url: string;
  groupId: string | null;
};

const isPushPayload = (data: unknown): data is PushPayload => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.type === 'yowl-push' && typeof d.title === 'string';
};

const pathMatchesGroup = (pathname: string, groupId: string): boolean =>
  pathname === `/${groupId}` || pathname.startsWith(`/${groupId}/`);

/**
 * When the SW suppresses an OS notification because a window is focused,
 * show a clickable toast for messages in groups the user is not viewing.
 */
export const InAppPushToastListener: React.FC = () => {
  const toast = UI.useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = React.useRef(location.pathname);
  pathnameRef.current = location.pathname;

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (!isPushPayload(event.data)) return;
      const { title, body, url, groupId } = event.data;

      if (groupId && pathMatchesGroup(pathnameRef.current, groupId)) {
        return;
      }

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

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, [navigate, toast]);

  return null;
};

import { useServiceWorkerUpdate } from '@@lib/pwa/useServiceWorkerUpdate';
import * as UI from '@@ui';
import React from 'react';

const TOAST_ID = 'yowl-sw-update';

/**
 * Offers the new build instead of swapping it in mid-session, which would
 * reload the document out from under whatever the user was doing.
 */
export const UpdatePrompt: React.FC = () => {
  const toast = UI.useToast();
  const { needRefresh, update } = useServiceWorkerUpdate();

  React.useEffect(() => {
    if (!needRefresh || toast.isActive(TOAST_ID)) return;

    toast({
      id: TOAST_ID,
      position: 'top',
      duration: null,
      isClosable: true,
      render: ({ onClose }) => (
        <UI.HStack
          maxW="sm"
          px={4}
          py={3}
          borderRadius="md"
          bg="surface.raised"
          borderWidth="1px"
          borderColor="border.subtle"
          boxShadow="md"
          spacing={3}
          data-testid="sw-update-prompt"
        >
          <UI.Text fontSize="sm" flex="1">
            A new version of Yowl is ready.
          </UI.Text>
          <UI.Button
            size="sm"
            preset="primary"
            onClick={() => {
              onClose();
              update();
            }}
          >
            Reload
          </UI.Button>
        </UI.HStack>
      ),
    });
  }, [needRefresh, toast, update]);

  return null;
};

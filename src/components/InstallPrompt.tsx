import { useInstallPrompt } from '@@lib/pwa/useInstallPrompt';
import * as UI from '@@ui';
import { faDownload, faShareFromSquare, faXmark } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

export const InstallPrompt: React.FC = () => {
  const { dismiss, install, showBanner, showInstallButton, showIosHint } =
    useInstallPrompt();

  if (!showBanner) return null;

  return (
    <UI.Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex="banner"
      px={4}
      pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
      pt={2}
      pointerEvents="none"
    >
      <UI.Box
        maxW="480px"
        mx="auto"
        bg="green.500"
        color="white"
        borderRadius="lg"
        shadow="lg"
        px={4}
        py={3}
        pointerEvents="auto"
        data-testid="pwa-install-banner"
      >
        <UI.HStack alignItems="flex-start" spacing={3}>
          <UI.Icon
            icon={showIosHint ? faShareFromSquare : faDownload}
            boxSize={5}
            mt={0.5}
            aria-hidden
          />
          <UI.Box flex="1">
            <UI.Text fontWeight="bold" fontSize="sm">
              Install Hork
            </UI.Text>
            <UI.Text fontSize="sm" opacity={0.95}>
              {showIosHint
                ? 'Tap Share, then Add to Home Screen for a full-screen app experience.'
                : 'Add Hork to your home screen for quick access during your trip.'}
            </UI.Text>
          </UI.Box>
          <UI.IconButton
            aria-label="Dismiss install prompt"
            icon={<UI.Icon icon={faXmark} />}
            size="sm"
            variant="ghost"
            color="white"
            _hover={{ bg: 'whiteAlpha.200' }}
            onClick={dismiss}
          />
        </UI.HStack>
        {showInstallButton ? (
          <UI.Button
            size="sm"
            mt={3}
            w="full"
            colorScheme="whiteAlpha"
            variant="solid"
            bg="white"
            color="green.600"
            _hover={{ bg: 'whiteAlpha.900' }}
            onClick={() => void install()}
          >
            Install app
          </UI.Button>
        ) : null}
      </UI.Box>
    </UI.Box>
  );
};

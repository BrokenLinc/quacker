import * as UI from '@@ui';
import { faMessage, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { Outlet, useMatch } from 'react-router-dom';

import { useGroups } from '@@api';
import { SignInForm } from '@@components/auth/SignInForm';
import { useSignInPlacement } from '@@components/auth/useSignInPlacement';
import { SignInPlacementFromAuth } from '@@components/auth/SignInPlacementFromAuth';
import { useAuthState } from '@@lib/supabase/auth';
import { useVisualViewportHeight } from '@@lib/pwa/useVisualViewportHeight';
import { routes } from '@@routing/routes';

import { NewGroupIconButton } from './NewGroupModal';
import { UserMenu } from './UserMenu';

/**
 * App frame: fixed-viewport shell with internal scrolling (chat-app pattern).
 * Height tracks visualViewport (`--app-height`); `#root` top tracks
 * `--app-offset-top` so the shell sits in the visible viewport above the
 * keyboard (no blank canvas gap). Safe-area insets pad chrome.
 * Desktop (md+): persistent left sidebar with group nav.
 * Mobile: compact top header on non-group routes; group pages render their
 * own single bar.
 */
export const AppLayout: React.FC = () => {
  useVisualViewportHeight();
  const isMobile = UI.useBreakpointValue(
    { base: true, md: false },
    { ssr: false }
  );
  const groupMatch = useMatch('/:groupId');
  const slugMatch = useMatch('/g/:slug');
  const isGroupRoute = Boolean(groupMatch) && !slugMatch;

  return (
    <SignInPlacementFromAuth>
      <UI.Flex
        direction="column"
        h="var(--app-height, 100dvh)"
        maxH="var(--app-height, 100dvh)"
        overflow="hidden"
        bg="surface.canvas"
      >
        {isMobile && !isGroupRoute ? <MobileHeader /> : null}
        <UI.Flex flex={1} minH={0}>
          {!isMobile ? <Sidebar /> : null}
          <UI.Flex
            as="main"
            direction="column"
            flex={1}
            minW={0}
            overflow="hidden"
          >
            <Outlet />
          </UI.Flex>
        </UI.Flex>
      </UI.Flex>
    </SignInPlacementFromAuth>
  );
};

export const BrandLink: React.FC<Omit<UI.LinkProps, 'children'>> = (props) => (
  <UI.RouteLink
    route={routes.home()}
    display="inline-flex"
    alignItems="center"
    gap={2}
    color="brand.500"
    _dark={{ color: 'brand.300' }}
    textDecoration="none"
    _hover={{ textDecoration: 'none' }}
    {...props}
  >
    <UI.Icon icon={faMessage} />
    <UI.Text as="span" fontWeight="bold" fontSize="sm">
      hork
    </UI.Text>
  </UI.RouteLink>
);

const MobileHeader: React.FC = () => {
  const [user] = useAuthState();

  return (
    <UI.HStack
      px={4}
      pt="calc(0.5rem + env(safe-area-inset-top, 0px))"
      pb={2}
      borderBottom="1px solid"
      borderColor="border.subtle"
      flexShrink={0}
      bg="surface.raised"
    >
      <BrandLink mr="auto" />
      {user ? <UserMenu showGroups showColorMode /> : <HeaderSignIn />}
    </UI.HStack>
  );
};

const Sidebar: React.FC = () => {
  const [user] = useAuthState();

  return (
    <UI.Flex
      direction="column"
      w="260px"
      flexShrink={0}
      bg="surface.sunken"
      borderRight="1px solid"
      borderColor="border.subtle"
      pt="env(safe-area-inset-top, 0px)"
      pb="env(safe-area-inset-bottom, 0px)"
    >
      <UI.HStack px={4} py={3} spacing={1}>
        <BrandLink mr="auto" />
        {user ? <NewGroupIconButton /> : <HeaderSignIn />}
      </UI.HStack>

      {user ? (
        <React.Fragment>
          <UI.Box
            flex={1}
            minH={0}
            overflowY="auto"
            overscrollBehavior="contain"
            px={3}
            py={1}
          >
            <SidebarGroupNav />
          </UI.Box>
          <UI.HStack
            px={3}
            py={3}
            borderTop="1px solid"
            borderColor="border.subtle"
          >
            <UserMenu />
            <UI.Text fontSize="sm" fontWeight="medium" noOfLines={1} flex={1}>
              {user.displayName || user.phone || user.email}
            </UI.Text>
            <ColorModeIconButton />
          </UI.HStack>
        </React.Fragment>
      ) : (
        <UI.Box flex={1} />
      )}
    </UI.Flex>
  );
};

const SidebarGroupNav: React.FC = () => {
  const [user] = useAuthState();
  const [groups, loading, error] = useGroups({
    userId: user?.uid,
    channelId: 'sidebar',
  });

  if (loading) {
    return (
      <UI.VStack align="stretch" spacing={2} px={2} py={1}>
        <UI.Skeleton h={6} borderRadius="md" />
        <UI.Skeleton h={6} borderRadius="md" />
        <UI.Skeleton h={6} borderRadius="md" />
      </UI.VStack>
    );
  }
  if (error) {
    return (
      <UI.Text fontSize="sm" color="text.muted" px={2} py={1}>
        Couldn't load groups.
      </UI.Text>
    );
  }
  if (!groups?.length) {
    return (
      <UI.Text fontSize="sm" color="text.muted" px={2} py={1}>
        No groups yet
      </UI.Text>
    );
  }

  return (
    <UI.VStack align="stretch" spacing={0.5}>
      {groups.map((group) => (
        <UI.RouteLink
          key={group.id}
          route={routes.group(group.id)}
          px={2}
          py={1.5}
          borderRadius="md"
          fontSize="sm"
          fontWeight="medium"
          color="inherit"
          textDecoration="none"
          noOfLines={1}
          _hover={{ bg: 'border.subtle', textDecoration: 'none' }}
          activeProps={{ bg: 'nav.selected', fontWeight: 'bold' }}
        >
          {group.name}
        </UI.RouteLink>
      ))}
    </UI.VStack>
  );
};

const ColorModeIconButton: React.FC = () => {
  const { colorMode, toggleColorMode } = UI.useColorMode();
  return (
    <UI.IconButton
      aria-label={
        colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
      }
      icon={colorMode === 'light' ? faMoon : faSun}
      onClick={toggleColorMode}
      size="sm"
      variant="ghost"
    />
  );
};

const HeaderSignIn: React.FC = () => {
  const placement = useSignInPlacement();
  const signInModal = UI.useDisclosure();

  if (placement === 'inline') return null;

  return (
    <React.Fragment>
      <UI.Button
        size="sm"
        variant="outline"
        onClick={signInModal.onOpen}
        data-testid="header-log-in"
      >
        Log in
      </UI.Button>
      <UI.QuickModal {...signInModal} headerContent="Sign in">
        <UI.ModalBody pb={6}>
          <SignInForm onSuccess={signInModal.onClose} />
        </UI.ModalBody>
      </UI.QuickModal>
    </React.Fragment>
  );
};

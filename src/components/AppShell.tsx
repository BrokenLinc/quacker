import * as UI from '@@ui';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { Outlet, useMatch } from 'react-router-dom';

import { useGroups, useUnreadCounts } from '@@api';
import { SignInForm } from '@@components/auth/SignInForm';
import { useSignInPlacement } from '@@components/auth/useSignInPlacement';
import { SignInPlacementFromAuth } from '@@components/auth/SignInPlacementFromAuth';
import { useUnreadAppChrome } from '@@lib/notifications/documentChrome';
import { InAppPushToastListener } from '@@lib/notifications/inAppPushToast';
import { useAuthState } from '@@lib/supabase/auth';
import { useVisualViewportHeight } from '@@lib/pwa/useVisualViewportHeight';
import { routes } from '@@routing/routes';

import { NewGroupIconButton } from './NewGroupModal';
import { UserMenu } from './UserMenu';

/**
 * App frame: fixed-viewport shell with internal scrolling (chat-app pattern).
 * `#root` geometry: `index.html` + `useVisualViewportHeight` (see docs/ux.md).
 * Desktop (md+): persistent left sidebar with group nav.
 * Mobile: compact top header on non-group routes; group pages render their
 * own single bar.
 */
const UnreadAppChrome: React.FC = () => {
  const [user] = useAuthState();
  useUnreadAppChrome({ userId: user?.uid });
  return null;
};

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
      <UnreadAppChrome />
      <InAppPushToastListener />
      <UI.Flex
        direction="column"
        position="absolute"
        inset={0}
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
    textDecoration="none"
    _hover={{ textDecoration: 'none' }}
    {...props}
  >
    <UI.Image src="/yowl-logo.svg" alt="Yowl" h="22px" w="auto" />
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
      {user ? <UserMenu showColorMode /> : <HeaderSignIn />}
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
            overscrollBehavior="auto"
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

const formatUnread = (n: number): string => (n > 99 ? '99+' : String(n));

const SidebarGroupNav: React.FC = () => {
  const [user] = useAuthState();
  const [groups, loading, error] = useGroups({
    userId: user?.uid,
    channelId: 'sidebar',
  });
  const [unread] = useUnreadCounts({
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
      {groups.map((group) => {
        const count = unread[group.id] ?? 0;
        return (
          <UI.RouteLink
            key={group.id}
            route={routes.group(group.id)}
            display="flex"
            alignItems="center"
            gap={2}
            px={2}
            py={1.5}
            borderRadius="md"
            fontSize="sm"
            fontWeight="medium"
            color="inherit"
            textDecoration="none"
            _hover={{ bg: 'border.subtle', textDecoration: 'none' }}
            activeProps={{ bg: 'nav.selected', fontWeight: 'bold' }}
          >
            <UI.Text as="span" noOfLines={1} flex={1} minW={0}>
              {group.name}
            </UI.Text>
            {count > 0 ? (
              <UI.IndicatorBadge
                active
                borderRadius="full"
                minW={5}
                px={1.5}
                fontSize="xs"
                flexShrink={0}
                aria-label={`${count} new messages`}
              >
                {formatUnread(count)}
              </UI.IndicatorBadge>
            ) : null}
          </UI.RouteLink>
        );
      })}
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

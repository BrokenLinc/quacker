import * as UI from '@@ui';
import { faLightbulb, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { Outlet, useLocation, useMatch } from 'react-router-dom';

import { useGroups, useUnreadCounts } from '@@api';
import { SignInForm } from '@@components/auth/SignInForm';
import { FtueHoldContext } from '@@components/auth/ftueHoldContext';
import { useSignInPlacement } from '@@components/auth/useSignInPlacement';
import { SignInPlacementFromAuth } from '@@components/auth/SignInPlacementFromAuth';
import { useUnreadAppChrome } from '@@lib/notifications/documentChrome';
import { InAppPushToastListener } from '@@lib/notifications/inAppPushToast';
import {
  appUserHasChosenDisplayName,
  useAuthState,
} from '@@lib/supabase/auth';
import { useVisualViewportHeight } from '@@lib/pwa/useVisualViewportHeight';
import { routes } from '@@routing/routes';

import { NewGroupIconButton } from './NewGroupModal';
import { UserMenu } from './UserMenu';

/**
 * App frame: fixed-viewport shell with internal scrolling (chat-app pattern).
 * `#root` geometry: `index.html` + `useVisualViewportHeight` (see docs/ux.md).
 * Desktop (md+): persistent left sidebar with group nav.
 * Mobile: compact top header on non-group / non-suggestions routes; group and
 * suggestions pages render their own top bar.
 */
const UnreadAppChrome: React.FC = () => {
  const [user] = useAuthState();
  useUnreadAppChrome({ userId: user?.uid });
  return null;
};

export const AppLayout: React.FC = () => {
  useVisualViewportHeight();
  const [user] = useAuthState();
  const [ftueHold, setFtueHold] = React.useState(false);
  const isMobile = UI.useBreakpointValue(
    { base: true, md: false },
    { ssr: false }
  );
  const location = useLocation();
  const groupMatch = useMatch('/:groupId');
  const slugMatch = useMatch('/g/:slug');
  const isSuggestionsRoute = location.pathname.startsWith('/suggestions');
  // `/:groupId` also matches `/suggestions` — exclude known non-room paths.
  const isGroupRoute =
    Boolean(groupMatch) && !slugMatch && !isSuggestionsRoute;
  const hidesMobileShellHeader = isGroupRoute || isSuggestionsRoute;

  React.useEffect(() => {
    if (!user) {
      setFtueHold(false);
      return;
    }
    if (!appUserHasChosenDisplayName(user)) {
      setFtueHold(true);
    }
  }, [user]);

  // Chrome-less for signed-out login and post-auth onboarding (name / create-room).
  const showChrome = Boolean(user) && !ftueHold;
  const endFtue = React.useCallback(() => setFtueHold(false), []);

  return (
    <FtueHoldContext.Provider value={{ ftueHold, endFtue }}>
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
          {showChrome && isMobile && !hidesMobileShellHeader ? (
            <MobileHeader />
          ) : null}
          <UI.Flex flex={1} minH={0}>
            {showChrome && !isMobile ? <Sidebar /> : null}
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
    </FtueHoldContext.Provider>
  );
};

export const BrandLink: React.FC<UI.BoxProps> = (props) => {
  const [open, setOpen] = React.useState(false);

  return (
    <UI.Box display="inline-flex" alignItems="center" {...props}>
      <UI.MorphingPopover
        open={open}
        onOpenChange={setOpen}
        anchor="top left"
      >
        <UI.MorphingPopoverTrigger aria-label="Yowl">
          <UI.Image
            src="/yowl-logo.svg"
            alt=""
            h="22px"
            w="auto"
            aria-hidden
          />
        </UI.MorphingPopoverTrigger>
        <UI.MorphingPopoverContent aria-label="About Yowl">
          <UI.Box px={4} py={4} maxW="280px">
            <UI.Text fontSize="sm" whiteSpace="pre-wrap">
              {
                "Hi! Thanks for trying my app. I made Yowl after bar-hopping with randos at a developer conference. SMS groups were too messy, and Slack/Discord were too complicated. I hope you like it!\n❤️ Linc"
              }
            </UI.Text>
          </UI.Box>
        </UI.MorphingPopoverContent>
      </UI.MorphingPopover>
    </UI.Box>
  );
};

const SuggestionsNavIconButton: React.FC = () => (
  <UI.IconButton
    as={UI.RouteLink}
    route={routes.suggestions()}
    aria-label="Suggestions"
    data-testid="suggestions-nav"
    icon={faLightbulb}
    size="sm"
    variant="ghost"
  />
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
      {user ? (
        <React.Fragment>
          <SuggestionsNavIconButton />
          <UserMenu showColorMode />
        </React.Fragment>
      ) : (
        <HeaderSignIn />
      )}
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
        {user ? (
          <React.Fragment>
            <SuggestionsNavIconButton />
            <NewGroupIconButton />
          </React.Fragment>
        ) : (
          <HeaderSignIn />
        )}
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
        Couldn't load rooms.
      </UI.Text>
    );
  }
  if (!groups?.length) {
    return (
      <UI.Text fontSize="sm" color="text.muted" px={2} py={1}>
        No rooms yet
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

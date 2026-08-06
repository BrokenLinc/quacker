import * as UI from '@@ui';
import {
  faLightbulb,
  faMoon,
  faShieldHalved,
  faSun,
  faUsers,
  faComments,
  faCloudMoon,
} from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';

import {
  useGroups,
  useMySuperBan,
  useSetSiteLockdown,
  useSiteSettings,
  useUnreadCounts,
} from '@@api';
import { retryGroups } from '@@api/cache';
import { SignInForm } from '@@components/auth/SignInForm';
import { FtueHoldContext } from '@@components/auth/ftueHoldContext';
import { useSignInPlacement } from '@@components/auth/useSignInPlacement';
import { SignInPlacementFromAuth } from '@@components/auth/SignInPlacementFromAuth';
import { installAppLifecycle } from '@@lib/lifecycle/appLifecycle';
import { useUnreadAppChrome } from '@@lib/notifications/documentChrome';
import { InAppPushToastListener } from '@@lib/notifications/inAppPushToast';
import {
  appUserHasChosenDisplayName,
  isSuperAdminPhone,
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

const SiteOfflineScreen: React.FC = () => (
  <UI.Box
    flex={1}
    overflowY="auto"
    data-testid="site-offline"
  >
    <UI.EmptyState
      icon={faCloudMoon}
      title="Yowl is temporarily offline"
      description="We're working on it!"
    />
  </UI.Box>
);

const AccountDeactivatedScreen: React.FC = () => (
  <UI.Box flex={1} overflowY="auto" data-testid="account-deactivated">
    <UI.EmptyState
      icon={faShieldHalved}
      title="Account deactivated"
      description="This account has been deactivated and can't use Yowl."
    />
  </UI.Box>
);

export const AppLayout: React.FC = () => {
  useVisualViewportHeight();
  React.useEffect(() => installAppLifecycle(), []);
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
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSuperadminSignIn = location.pathname === routes.superadminSignIn().path;
  const isGroupRoute =
    Boolean(groupMatch) &&
    !slugMatch &&
    !isSuggestionsRoute &&
    !isAdminRoute &&
    !isSuperadminSignIn;
  const hidesMobileShellHeader =
    isGroupRoute || isSuggestionsRoute || isAdminRoute || isSuperadminSignIn;

  const isSuperAdmin = isSuperAdminPhone(user?.phone);
  const [settings, settingsLoading] = useSiteSettings();
  const [moderation, moderationLoading] = useMySuperBan(user?.uid);
  const lockdown = Boolean(settings?.lockdown);
  const superBanned = Boolean(moderation?.superBannedAt);

  React.useEffect(() => {
    if (!user) {
      setFtueHold(false);
      return;
    }
    if (!appUserHasChosenDisplayName(user)) {
      setFtueHold(true);
    }
  }, [user]);

  const showChrome = Boolean(user) && !ftueHold;
  const endFtue = React.useCallback(() => setFtueHold(false), []);

  const gateLoading =
    settingsLoading || (Boolean(user) && moderationLoading && !isSuperAdmin);

  let gated: React.ReactNode = null;
  if (!gateLoading) {
    if (lockdown && !isSuperAdmin) {
      if (!isSuperadminSignIn) {
        gated = <SiteOfflineScreen />;
      }
    } else if (user && superBanned && !isSuperAdmin) {
      gated = <AccountDeactivatedScreen />;
    }
  }

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
          {gated ? (
            gated
          ) : (
            <React.Fragment>
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
            </React.Fragment>
          )}
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

const SuperAdminNavButton: React.FC = () => {
  const [user] = useAuthState();
  const [open, setOpen] = React.useState(false);
  const [settings] = useSiteSettings();
  const setLockdown = useSetSiteLockdown();
  const toast = UI.useToast();
  const navigate = useNavigate();
  const lockdown = Boolean(settings?.lockdown);

  if (!isSuperAdminPhone(user?.phone)) return null;

  const onLockdownChange = async (next: boolean) => {
    try {
      await setLockdown.mutateAsync(next);
    } catch {
      toast({ title: "Couldn't update lockdown", status: 'error' });
    }
  };

  return (
    <UI.MorphingPopover open={open} onOpenChange={setOpen} anchor="top right">
      <UI.MorphingPopoverTrigger
        aria-label="SuperAdmin"
        data-testid="superadmin-nav"
        p={2}
        borderRadius="md"
      >
        <UI.Icon icon={faShieldHalved} />
      </UI.MorphingPopoverTrigger>
      <UI.MorphingPopoverContent aria-label="SuperAdmin" title="SuperAdmin">
        <UI.VStack align="stretch" spacing={0} py={1} minW="240px">
          <UI.FormControl
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={4}
            py={2.5}
          >
            <UI.FormLabel mb={0} fontSize="sm" fontWeight="normal">
              Site lockdown
            </UI.FormLabel>
            <UI.Switch
              colorScheme="teal"
              size="md"
              isChecked={lockdown}
              isDisabled={setLockdown.isPending}
              onChange={(e) => void onLockdownChange(e.target.checked)}
              aria-label="Site lockdown"
              data-testid="site-lockdown-switch"
            />
          </UI.FormControl>
          <UI.PopoverMenuRow
            icon={faComments}
            label="All groups"
            onClick={() => {
              setOpen(false);
              navigate(routes.adminGroups().path);
            }}
          />
          <UI.PopoverMenuRow
            icon={faUsers}
            label="All users"
            onClick={() => {
              setOpen(false);
              navigate(routes.adminUsers().path);
            }}
          />
        </UI.VStack>
      </UI.MorphingPopoverContent>
    </UI.MorphingPopover>
  );
};

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
          <SuperAdminNavButton />
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
            <SuperAdminNavButton />
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
  const [groups, loading, error] = useGroups({ userId: user?.uid });
  const [unread] = useUnreadCounts({ userId: user?.uid });

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
      <UI.VStack align="stretch" spacing={1} px={2} py={1}>
        <UI.Text fontSize="sm" color="text.muted">
          Couldn't load rooms.
        </UI.Text>
        <UI.Button size="xs" variant="link" onClick={retryGroups}>
          Try again
        </UI.Button>
      </UI.VStack>
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
  const [settings] = useSiteSettings();

  if (placement === 'inline') return null;
  if (settings?.lockdown) return null;

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

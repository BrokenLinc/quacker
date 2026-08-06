import React from 'react';
import {
  faArrowLeft,
  faBan,
  faComments,
  faEllipsisVertical,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import {
  setUserSuperBanned,
  useAdminUsersInfinite,
  type AdminUserRow,
} from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { UserAvatar } from '@@components/UserAvatar';
import { useConfirmation } from '@@dialogs/confirmation';
import {
  isSuperAdminPhone,
  useAuthState,
  type AppUser,
} from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';

const AdminUsersPage: React.FC = () => (
  <RequireAuth>
    <AdminUsersGate />
  </RequireAuth>
);
export default AdminUsersPage;

const AdminUsersGate: React.FC = () => {
  const [user, loading] = useAuthState();
  if (loading) {
    return (
      <UI.Box flex={1} overflowY="auto" p={4}>
        <UI.VStack align="stretch" spacing={3}>
          <UI.Skeleton h={8} borderRadius="md" />
          <UI.Skeleton h={16} borderRadius="lg" />
          <UI.Skeleton h={16} borderRadius="lg" />
        </UI.VStack>
      </UI.Box>
    );
  }
  if (!user || !isSuperAdminPhone(user.phone)) {
    return (
      <UI.Box flex={1} overflowY="auto">
        <UI.EmptyState
          icon={faBan}
          title="Not available"
          description="You don't have access to this page."
          action={
            <UI.RouteButton route={routes.home()} variant="outline">
              Back home
            </UI.RouteButton>
          }
        />
      </UI.Box>
    );
  }
  return <AdminUsersBody user={user} />;
};

const AdminUsersBody: React.FC<{ user: AppUser }> = ({ user }) => {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const toast = UI.useToast();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const query = useAdminUsersInfinite(debounced);
  const rows = query.data?.pages.flat() ?? [];

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || !query.hasNextPage || query.isFetchingNextPage) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      void query.fetchNextPage();
    }
  };

  return (
    <UI.Flex direction="column" flex={1} minH={0} data-testid="admin-users-page">
      <UI.HStack
        px={4}
        pt="calc(0.5rem + env(safe-area-inset-top, 0px))"
        pb={3}
        borderBottom="1px solid"
        borderColor="border.subtle"
        bg="surface.raised"
        spacing={2}
      >
        <UI.IconButton
          as={UI.RouteLink}
          route={routes.home()}
          aria-label="Back to home"
          icon={faArrowLeft}
          size="sm"
          variant="ghost"
        />
        <UI.Heading size="md" flex={1} noOfLines={1}>
          All users
        </UI.Heading>
      </UI.HStack>
      <UI.Box px={4} py={3} bg="surface.raised">
        <UI.Input
          placeholder="Search name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          data-testid="admin-users-search"
        />
      </UI.Box>
      <UI.Box
        ref={scrollRef}
        flex={1}
        minH={0}
        overflowY="auto"
        onScroll={onScroll}
        px={4}
        pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
      >
        {query.isPending ? (
          <UI.VStack align="stretch" spacing={2} pt={2}>
            <UI.Skeleton h={16} borderRadius="lg" />
            <UI.Skeleton h={16} borderRadius="lg" />
            <UI.Skeleton h={16} borderRadius="lg" />
          </UI.VStack>
        ) : query.isError ? (
          <UI.ErrorState
            title="Couldn't load users"
            onRetry={() => void query.refetch()}
          />
        ) : !rows.length ? (
          <UI.EmptyState
            icon={faUsers}
            title="No users found"
            description="Try a different search."
          />
        ) : (
          <UI.VStack align="stretch" spacing={2} pt={2}>
            {rows.map((u) => (
              <AdminUserCard
                key={u.userId}
                row={u}
                actorId={user.uid}
                onError={(title) => toast({ title, status: 'error' })}
              />
            ))}
            {query.isFetchingNextPage ? (
              <UI.Skeleton h={12} borderRadius="lg" />
            ) : null}
          </UI.VStack>
        )}
      </UI.Box>
    </UI.Flex>
  );
};

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone || '—';
};

const AdminUserCard: React.FC<{
  row: AdminUserRow;
  actorId: string;
  onError: (title: string) => void;
}> = ({ row, actorId, onError }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const confirmation = useConfirmation();
  const isSelf = row.userId === actorId;
  const isBanned = Boolean(row.superBannedAt);
  const name = row.displayName || 'Someone';

  const toggleBan = () => {
    setMenuOpen(false);
    if (isSelf) return;
    if (isBanned) {
      void setUserSuperBanned(row.userId, false, actorId).catch(() =>
        onError("Couldn't lift super-ban")
      );
      return;
    }
    confirmation.open({
      title: `Super-ban ${name}?`,
      message:
        'They can still sign in, but every screen will show an account deactivated message until you lift the ban.',
      confirmLabel: 'Super-ban',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await setUserSuperBanned(row.userId, true, actorId);
        } catch {
          onError("Couldn't super-ban user");
        }
      },
      onCancel: () => undefined,
    });
  };

  return (
    <UI.Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="surface.raised"
      px={3}
      py={3}
      data-testid="admin-user-card"
    >
      <UI.HStack align="flex-start" spacing={3}>
        <UserAvatar
          name={name}
          seed={row.userId}
          photoURL={row.photoURL}
          size="sm"
        />
        <UI.Box flex={1} minW={0}>
          <UI.HStack spacing={2} mb={0.5} flexWrap="wrap">
            <UI.Text fontWeight="bold" noOfLines={1}>
              {name}
            </UI.Text>
            {isBanned ? (
              <UI.Badge colorScheme="red" fontSize="xs">
                Super-banned
              </UI.Badge>
            ) : null}
          </UI.HStack>
          <UI.Text fontSize="sm" color="text.muted" mb={2}>
            {formatPhone(row.phone)}
          </UI.Text>
          <UI.HStack spacing={4} color="text.muted" fontSize="sm">
            <UI.HStack spacing={1}>
              <UI.Icon icon={faComments} boxSize={3} />
              <UI.Text>{row.messageCount}</UI.Text>
            </UI.HStack>
            <UI.HStack spacing={1}>
              <UI.Icon icon={faUsers} boxSize={3} />
              <UI.Text>{row.roomCount}</UI.Text>
            </UI.HStack>
          </UI.HStack>
        </UI.Box>
        {!isSelf ? (
          <UI.MorphingPopover
            open={menuOpen}
            onOpenChange={setMenuOpen}
            anchor="top right"
          >
            <UI.MorphingPopoverTrigger
              aria-label="User actions"
              data-testid="admin-user-menu"
              p={2}
              borderRadius="md"
            >
              <UI.Icon icon={faEllipsisVertical} />
            </UI.MorphingPopoverTrigger>
            <UI.MorphingPopoverContent aria-label="User actions">
              <UI.VStack align="stretch" spacing={0} py={1} minW="200px">
                <UI.PopoverMenuRow
                  icon={faBan}
                  label={isBanned ? 'Lift super-ban' : 'Super-ban'}
                  onClick={toggleBan}
                  isDestructive={!isBanned}
                />
              </UI.VStack>
            </UI.MorphingPopoverContent>
          </UI.MorphingPopover>
        ) : null}
      </UI.HStack>
    </UI.Box>
  );
};

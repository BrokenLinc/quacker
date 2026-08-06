import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  faArrowLeft,
  faBan,
  faComments,
  faDoorOpen,
  faEllipsisVertical,
  faRotateLeft,
  faToggleOff,
  faToggleOn,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import {
  restoreDeletedGroup,
  setGroupDeactivated,
  useAdminGroupsInfinite,
  type AdminGroupRow,
} from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { UserAvatar } from '@@components/UserAvatar';
import {
  isSuperAdminPhone,
  useAuthState,
  type AppUser,
} from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';

const AdminGroupsPage: React.FC = () => (
  <RequireAuth>
    <AdminGroupsGate />
  </RequireAuth>
);
export default AdminGroupsPage;

const AdminGroupsGate: React.FC = () => {
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
  return <AdminGroupsBody user={user} />;
};

const AdminGroupsBody: React.FC<{ user: AppUser }> = ({ user }) => {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const toast = UI.useToast();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const query = useAdminGroupsInfinite(debounced);
  const rows = query.data?.pages.flat() ?? [];

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || !query.hasNextPage || query.isFetchingNextPage) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      void query.fetchNextPage();
    }
  };

  return (
    <UI.Flex direction="column" flex={1} minH={0} data-testid="admin-groups-page">
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
          All groups
        </UI.Heading>
      </UI.HStack>
      <UI.Box px={4} py={3} bg="surface.raised">
        <UI.Input
          placeholder="Search name or creator"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          data-testid="admin-groups-search"
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
            title="Couldn't load groups"
            onRetry={() => void query.refetch()}
          />
        ) : !rows.length ? (
          <UI.EmptyState
            icon={faComments}
            title="No groups found"
            description="Try a different search."
          />
        ) : (
          <UI.VStack align="stretch" spacing={2} pt={2}>
            {rows.map((g) => (
              <AdminGroupCard
                key={g.id}
                group={g}
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

const AdminGroupCard: React.FC<{
  group: AdminGroupRow;
  actorId: string;
  onError: (title: string) => void;
}> = ({ group, actorId, onError }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const navigate = useNavigate();

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMenuOpen(false);
    try {
      await fn();
    } catch {
      onError("Couldn't update group");
    } finally {
      setBusy(false);
    }
  };

  return (
    <UI.Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      bg="surface.raised"
      px={3}
      py={3}
      data-testid="admin-group-card"
    >
      <UI.HStack align="flex-start" spacing={3}>
        <UI.Box flex={1} minW={0}>
          <UI.HStack spacing={2} mb={1} flexWrap="wrap">
            <UI.Text fontWeight="bold" noOfLines={1}>
              {group.name}
            </UI.Text>
            {group.deletedAt ? (
              <UI.Badge colorScheme="gray" fontSize="xs">
                Deleted
              </UI.Badge>
            ) : null}
            {group.deactivatedAt ? (
              <UI.Badge colorScheme="orange" fontSize="xs">
                Deactivated
              </UI.Badge>
            ) : null}
          </UI.HStack>
          <UI.HStack spacing={2} mb={2}>
            <UserAvatar
              name={group.creatorDisplayName || 'Someone'}
              seed={group.creatorId}
              photoURL={group.creatorPhotoURL}
              size="xs"
            />
            <UI.Text fontSize="sm" color="text.muted" noOfLines={1}>
              {group.creatorDisplayName || 'Someone'}
            </UI.Text>
          </UI.HStack>
          <UI.HStack spacing={4} color="text.muted" fontSize="sm">
            <UI.HStack spacing={1}>
              <UI.Icon icon={faUsers} boxSize={3} />
              <UI.Text>{group.memberCount}</UI.Text>
            </UI.HStack>
            <UI.HStack spacing={1}>
              <UI.Icon icon={faComments} boxSize={3} />
              <UI.Text>{group.messageCount}</UI.Text>
            </UI.HStack>
          </UI.HStack>
        </UI.Box>
        <UI.MorphingPopover
          open={menuOpen}
          onOpenChange={setMenuOpen}
          anchor="top right"
        >
          <UI.MorphingPopoverTrigger
            aria-label="Group actions"
            data-testid="admin-group-menu"
            p={2}
            borderRadius="md"
          >
            <UI.Icon icon={faEllipsisVertical} />
          </UI.MorphingPopoverTrigger>
          <UI.MorphingPopoverContent aria-label="Group actions">
            <UI.VStack align="stretch" spacing={0} py={1} minW="200px">
              <UI.PopoverMenuRow
                icon={faDoorOpen}
                label="Open chat"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(routes.group(group.id).path);
                }}
              />
              {group.deletedAt ? (
                <UI.PopoverMenuRow
                  icon={faRotateLeft}
                  label="Restore"
                  onClick={() => void run(() => restoreDeletedGroup(group.id))}
                />
              ) : null}
              <UI.PopoverMenuRow
                icon={group.deactivatedAt ? faToggleOn : faToggleOff}
                label={group.deactivatedAt ? 'Activate' : 'Deactivate'}
                onClick={() =>
                  void run(() =>
                    setGroupDeactivated(
                      group.id,
                      !group.deactivatedAt,
                      actorId
                    )
                  )
                }
                isDestructive={!group.deactivatedAt}
              />
            </UI.VStack>
          </UI.MorphingPopoverContent>
        </UI.MorphingPopover>
      </UI.HStack>
    </UI.Box>
  );
};

import { useGroups, useUnreadCounts } from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import {
  NewGroupButton,
  NewGroupIconButton,
} from '@@components/NewGroupModal';
import { useAuthState } from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import {
  faChevronRight,
  faComments,
} from '@fortawesome/free-solid-svg-icons';
import React from 'react';

const HomePage: React.FC = () => {
  return (
    <RequireAuth>
      <UI.Box
        flex={1}
        minH={0}
        overflowY="auto"
        overscrollBehavior="auto"
      >
        <UI.Box
          maxW="560px"
          mx="auto"
          px={4}
          pt={4}
          pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
        >
          <UI.HStack mb={4}>
            <UI.Heading size="md" mr="auto">
              Your groups
            </UI.Heading>
            <NewGroupIconButton />
          </UI.HStack>
          <GroupList />
        </UI.Box>
      </UI.Box>
    </RequireAuth>
  );
};
export default HomePage;

const formatUnread = (n: number): string => (n > 99 ? '99+' : String(n));

const GroupList: React.FC = () => {
  const [user] = useAuthState();
  const [groups, loading, error] = useGroups({
    userId: user?.uid,
    channelId: 'home',
  });
  const [unread] = useUnreadCounts({
    userId: user?.uid,
    channelId: 'home',
  });

  if (loading) {
    return (
      <UI.VStack align="stretch" spacing={2}>
        <UI.Skeleton h={12} borderRadius="lg" />
        <UI.Skeleton h={12} borderRadius="lg" />
        <UI.Skeleton h={12} borderRadius="lg" />
      </UI.VStack>
    );
  }

  if (error) {
    return (
      <UI.ErrorState
        title="Couldn't load your groups"
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!groups?.length) {
    return (
      <UI.EmptyState
        icon={faComments}
        title="No groups yet"
        description="Start a group for your trip or conference and share the link — friends join in one tap."
        action={<NewGroupButton size="md" />}
      />
    );
  }

  return (
    <UI.VStack
      align="stretch"
      spacing={0}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.subtle"
      bg="surface.raised"
      overflow="hidden"
      divider={<UI.Divider borderColor="border.subtle" />}
    >
      {groups.map((group) => {
        const count = unread[group.id] ?? 0;
        return (
          <UI.HStack
            as={UI.RouteLink}
            key={group.id}
            route={routes.group(group.id)}
            px={4}
            py={3}
            color="inherit"
            textDecoration="none"
            fontWeight="semibold"
            _hover={{ bg: 'surface.sunken', textDecoration: 'none' }}
          >
            <UI.Text noOfLines={1}>{group.name}</UI.Text>
            {count > 0 ? (
              <UI.IndicatorBadge
                active
                ml="auto"
                mr={2}
                borderRadius="full"
                minW={5}
                px={1.5}
                fontSize="xs"
                aria-label={`${count} new messages`}
              >
                {formatUnread(count)}
              </UI.IndicatorBadge>
            ) : (
              <UI.Box ml="auto" />
            )}
            <UI.Icon icon={faChevronRight} color="text.muted" />
          </UI.HStack>
        );
      })}
    </UI.VStack>
  );
};

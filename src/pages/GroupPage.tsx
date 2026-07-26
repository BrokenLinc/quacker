import { useChirpOnNewMessages } from '@@lib/notifications/chirp';
import { getShareUrl } from '@@lib/share';
import {
  Group,
  Message,
  addMessage,
  deleteGroup,
  isGroupMember,
  joinGroup,
  leaveGroup,
  removeGroupMember,
  updateGroup,
  useGroup,
  useGroupMembers,
  useGroupMessages,
} from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { UserAvatar } from '@@components/UserAvatar';
import { UserMenu } from '@@components/UserMenu';
import { useConfirmation } from '@@dialogs/confirmation';
import {
  AppUser,
  resolveAppUserPhotoURL,
  useAuthState,
} from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import {
  faArrowLeft,
  faComments,
  faCopy,
  faEllipsisVertical,
  faPaperPlane,
  faPenToSquare,
  faQrcode,
  faRightFromBracket,
  faShareFromSquare,
  faTrash,
  faUserPlus,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import QRCode from 'react-qr-code';
import { useNavigate, useParams } from 'react-router-dom';

const GroupPage: React.FC = () => {
  const { groupId } = useParams() as { groupId: string };

  return (
    <RequireAuth>
      {/* key resets chat state when switching groups via the sidebar */}
      <GroupPageContents key={groupId} groupId={groupId} />
    </RequireAuth>
  );
};
export default GroupPage;

const GroupPageContents: React.FC<{ groupId: string }> = ({ groupId }) => {
  const state = useGroupState(groupId);
  const { user, group, loading, error, member } = state;

  if (loading || (member === null && !error)) {
    return (
      <UI.Box flex={1} overflowY="auto" p={4} maxW="760px" w="full" mx="auto">
        <UI.VStack align="stretch" spacing={4}>
          <UI.Skeleton h={8} borderRadius="md" />
          <UI.SkeletonText noOfLines={3} spacing={3} />
          <UI.SkeletonText noOfLines={2} spacing={3} />
        </UI.VStack>
      </UI.Box>
    );
  }

  if (error) {
    return (
      <UI.Box flex={1} overflowY="auto">
        <UI.ErrorState
          title="Couldn't load this group"
          onRetry={() => window.location.reload()}
        />
      </UI.Box>
    );
  }

  if (!group || !user) {
    return (
      <UI.Box flex={1} overflowY="auto">
        <UI.EmptyState
          icon={faComments}
          title="Group not found"
          description="This group may have been deleted, or the link is wrong."
          action={
            <UI.RouteButton route={routes.home()} variant="outline">
              Back home
            </UI.RouteButton>
          }
        />
      </UI.Box>
    );
  }

  return (
    <React.Fragment>
      <GroupBar group={group} user={user} isMember={member === true} />
      {member ? (
        <GroupChat groupId={groupId} group={group} user={user} />
      ) : (
        <JoinPrompt group={group} onJoin={state.join} joining={state.joining} />
      )}
    </React.Fragment>
  );
};

/** Group + auth + membership state. Joining is explicit — no silent auto-join. */
const useGroupState = (groupId: string) => {
  const [user, userLoading, userError] = useAuthState();
  const [group, groupLoading, groupError] = useGroup(groupId, {
    channelId: 'page',
  });
  const [member, setMember] = React.useState<boolean | null>(null);
  const [joining, setJoining] = React.useState(false);

  React.useEffect(() => {
    if (!user || !groupId) {
      setMember(null);
      return;
    }
    let cancelled = false;
    isGroupMember(groupId, user.uid).then((isMember) => {
      if (!cancelled) setMember(isMember);
    });
    return () => {
      cancelled = true;
    };
  }, [user, groupId]);

  const join = async () => {
    if (!user) return;
    setJoining(true);
    try {
      await joinGroup(groupId, {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: resolveAppUserPhotoURL(user),
      });
      setMember(true);
    } finally {
      setJoining(false);
    }
  };

  return {
    user,
    group,
    loading: userLoading || groupLoading,
    error: userError || groupError,
    member,
    join,
    joining,
  };
};

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

const GroupBar: React.FC<{
  group: Group;
  user: AppUser;
  isMember: boolean;
}> = ({ group, user, isMember }) => {
  const isMobile = UI.useBreakpointValue(
    { base: true, md: false },
    { ssr: false }
  );

  return (
    <UI.HStack
      px={3}
      pt={{
        base: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
        md: 2,
      }}
      pb={2}
      spacing={2}
      flexShrink={0}
      borderBottom="1px solid"
      borderColor="border.subtle"
      bg="surface.raised"
    >
      {isMobile ? (
        <UI.IconButton
          as={UI.RouteLink}
          route={routes.home()}
          aria-label="Back to home"
          icon={faArrowLeft}
          size="sm"
          variant="ghost"
          color="inherit"
        />
      ) : null}
      {isMember ? (
        <GroupOverflowMenu group={group} user={user} />
      ) : (
        <UI.Heading size="sm" noOfLines={1} mr="auto">
          <UI.Text as="span" data-testid="group-title">
            {group.name}
          </UI.Text>
        </UI.Heading>
      )}
      <ShareButton group={group} />
      {isMobile ? <UserMenu showGroups showColorMode /> : null}
    </UI.HStack>
  );
};

const ShareButton: React.FC<{ group: Group }> = ({ group }) => {
  const modal = UI.useDisclosure();
  const toast = UI.useToast();
  const shareUrl = getShareUrl(group.slug);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copied', status: 'success', duration: 2000 });
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: group.name, url: shareUrl });
    } else {
      copyLink();
    }
  };

  return (
    <React.Fragment>
      <UI.IconButton
        aria-label="Share"
        icon={faShareFromSquare}
        variant="ghost"
        size="sm"
        onClick={modal.onOpen}
      />

      <UI.QuickModal
        headerContent={
          <React.Fragment>
            <UI.Icon icon={faQrcode} mr={2} />
            Share {group.name}
          </React.Fragment>
        }
        size="md"
        {...modal}
      >
        <UI.ModalBody px={6} pb={6}>
          <UI.VStack spacing={4}>
            <UI.Box
              bg="white"
              p={6}
              borderRadius="2xl"
              border="1px solid"
              borderColor="border.subtle"
              shadow="sm"
            >
              <QRCode value={shareUrl} size={220} />
            </UI.Box>
            <UI.Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
              {shareUrl}
            </UI.Text>
            <UI.ButtonGroup size="sm">
              <UI.Button
                preset="primary"
                leftIcon={<UI.Icon icon={faCopy} />}
                onClick={copyLink}
              >
                Copy link
              </UI.Button>
              <UI.Button
                variant="outline"
                leftIcon={<UI.Icon icon={faShareFromSquare} />}
                onClick={nativeShare}
              >
                Share
              </UI.Button>
            </UI.ButtonGroup>
          </UI.VStack>
        </UI.ModalBody>
      </UI.QuickModal>
    </React.Fragment>
  );
};

const GroupOverflowMenu: React.FC<{ group: Group; user: AppUser }> = ({
  group,
  user,
}) => {
  const isCreator = group.uid === user.uid;
  const membersModal = UI.useDisclosure();
  const renameModal = UI.useDisclosure();
  const sheet = UI.useDisclosure();
  const confirmation = useConfirmation();
  const toast = UI.useToast();
  const navigate = useNavigate();
  const isMobile = UI.useBreakpointValue(
    { base: true, md: false },
    { ssr: false }
  );

  const handleLeave = () => {
    confirmation.open({
      title: `Leave ${group.name}?`,
      message: 'You can rejoin any time with an invite link.',
      confirmLabel: 'Leave group',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await leaveGroup(group.id, user.uid);
          navigate(routes.home().path);
          toast({ title: `Left ${group.name}`, duration: 2500 });
        } catch {
          toast({ title: "Couldn't leave the group", status: 'error' });
        }
      },
      onCancel: () => undefined,
    });
  };

  const handleDelete = () => {
    confirmation.open({
      title: `Delete ${group.name}?`,
      message: 'This deletes the group and all its messages for everyone.',
      confirmLabel: 'Delete group',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteGroup(group.id);
          navigate(routes.home().path);
          toast({ title: `Deleted ${group.name}`, duration: 2500 });
        } catch {
          toast({ title: "Couldn't delete the group", status: 'error' });
        }
      },
      onCancel: () => undefined,
    });
  };

  const sheetItems: UI.ActionSheetItem[] = [
    {
      id: 'members',
      label: 'Members',
      icon: faUsers,
      onClick: membersModal.onOpen,
    },
  ];
  if (isCreator) {
    sheetItems.push({
      id: 'rename',
      label: 'Rename group',
      icon: faPenToSquare,
      onClick: renameModal.onOpen,
    });
    sheetItems.push({
      id: 'delete',
      label: 'Delete group',
      icon: faTrash,
      isDestructive: true,
      onClick: handleDelete,
    });
  } else {
    sheetItems.push({
      id: 'leave',
      label: 'Leave group',
      icon: faRightFromBracket,
      isDestructive: true,
      onClick: handleLeave,
    });
  }

  const modals = (
    <React.Fragment>
      <MembersModal
        group={group}
        user={user}
        isOpen={membersModal.isOpen}
        onClose={membersModal.onClose}
      />
      <RenameGroupModal
        group={group}
        isOpen={renameModal.isOpen}
        onClose={renameModal.onClose}
      />
    </React.Fragment>
  );

  if (isMobile) {
    return (
      <React.Fragment>
        <UI.Button
          variant="ghost"
          size="sm"
          flex={1}
          minW={0}
          px={2}
          h="auto"
          py={1}
          fontWeight="bold"
          fontSize="md"
          justifyContent="flex-start"
          rightIcon={
            <UI.Icon icon={faEllipsisVertical} boxSize={3} color="text.muted" />
          }
          onClick={sheet.onOpen}
          aria-label={`${group.name} options`}
        >
          <UI.Text as="span" noOfLines={1} data-testid="group-title">
            {group.name}
          </UI.Text>
        </UI.Button>
        <UI.ActionSheet
          isOpen={sheet.isOpen}
          onClose={sheet.onClose}
          headerContent={group.name}
          items={sheetItems}
          mobilePlacement="top"
        />
        {modals}
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <UI.Menu>
        <UI.MenuButton
          as={UI.Button}
          variant="ghost"
          size="sm"
          flex={1}
          minW={0}
          px={2}
          h="auto"
          py={1}
          fontWeight="bold"
          fontSize="md"
          justifyContent="flex-start"
          rightIcon={
            <UI.Icon icon={faEllipsisVertical} boxSize={3} color="text.muted" />
          }
          aria-label={`${group.name} options`}
        >
          <UI.Text as="span" noOfLines={1} data-testid="group-title">
            {group.name}
          </UI.Text>
        </UI.MenuButton>
        <UI.MenuList>
          <UI.MenuItem
            fontSize="sm"
            icon={<UI.Icon icon={faUsers} />}
            onClick={membersModal.onOpen}
          >
            Members
          </UI.MenuItem>
          {isCreator ? (
            <UI.MenuItem
              fontSize="sm"
              icon={<UI.Icon icon={faPenToSquare} />}
              onClick={renameModal.onOpen}
            >
              Rename group
            </UI.MenuItem>
          ) : null}
          <UI.MenuDivider />
          {isCreator ? (
            <UI.MenuItem
              fontSize="sm"
              color="red.500"
              icon={<UI.Icon icon={faTrash} />}
              onClick={handleDelete}
            >
              Delete group
            </UI.MenuItem>
          ) : (
            <UI.MenuItem
              fontSize="sm"
              color="red.500"
              icon={<UI.Icon icon={faRightFromBracket} />}
              onClick={handleLeave}
            >
              Leave group
            </UI.MenuItem>
          )}
        </UI.MenuList>
      </UI.Menu>
      {modals}
    </React.Fragment>
  );
};

/* ------------------------------------------------------------------ */
/* Members + rename                                                    */
/* ------------------------------------------------------------------ */

const MembersModal: React.FC<{
  group: Group;
  user: AppUser;
  isOpen: boolean;
  onClose: () => void;
}> = ({ group, user, isOpen, onClose }) => {
  return (
    <UI.QuickModal isOpen={isOpen} onClose={onClose} headerContent="Members">
      <UI.ModalBody pb={6}>
        {isOpen ? <MembersList group={group} user={user} /> : null}
      </UI.ModalBody>
    </UI.QuickModal>
  );
};

const MembersList: React.FC<{ group: Group; user: AppUser }> = ({
  group,
  user,
}) => {
  const [members, loading, error] = useGroupMembers(group.id);
  const confirmation = useConfirmation();
  const toast = UI.useToast();
  const isCreator = group.uid === user.uid;

  if (loading) {
    return (
      <UI.VStack align="stretch" spacing={3}>
        <UI.Skeleton h={8} borderRadius="md" />
        <UI.Skeleton h={8} borderRadius="md" />
      </UI.VStack>
    );
  }
  if (error) {
    return <UI.ErrorState title="Couldn't load members" py={4} />;
  }

  const handleRemove = (memberUid: string, memberName: string) => {
    confirmation.open({
      title: `Remove ${memberName}?`,
      message: 'They can rejoin with an invite link.',
      confirmLabel: 'Remove',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await removeGroupMember(group.id, memberUid);
        } catch {
          toast({ title: "Couldn't remove member", status: 'error' });
        }
      },
      onCancel: () => undefined,
    });
  };

  return (
    <UI.VStack align="stretch" spacing={1}>
      {members?.map((member) => {
        const name =
          member.uid === user.uid
            ? user.displayName || 'You'
            : member.displayName || 'Member';
        return (
          <UI.HStack key={member.uid} py={1.5} spacing={3}>
            <UserAvatar
              name={name}
              seed={member.uid}
              photoURL={member.photoURL}
              size="sm"
            />
            <UI.Text fontSize="sm" fontWeight="medium" noOfLines={1}>
              {name}
              {member.uid === user.uid ? ' (you)' : ''}
            </UI.Text>
            {member.role === 'creator' ? (
              <UI.Badge colorScheme="gray" fontSize="2xs">
                creator
              </UI.Badge>
            ) : null}
            {isCreator && member.uid !== user.uid ? (
              <UI.IconButton
                aria-label={`Remove ${name}`}
                icon={faXmark}
                size="xs"
                variant="ghost"
                ml="auto"
                onClick={() => handleRemove(member.uid, name)}
              />
            ) : null}
          </UI.HStack>
        );
      })}
    </UI.VStack>
  );
};

const RenameGroupModal: React.FC<{
  group: Group;
  isOpen: boolean;
  onClose: () => void;
}> = ({ group, isOpen, onClose }) => {
  const [name, setName] = React.useState(group.name);
  const [saving, setSaving] = React.useState(false);
  const toast = UI.useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await updateGroup(group.id, { name: trimmed });
      onClose();
    } catch {
      toast({
        title: "Couldn't rename the group",
        description: 'Check your connection and try again.',
        status: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <UI.QuickModal
      isOpen={isOpen}
      onClose={onClose}
      headerContent="Rename group"
    >
      <UI.ModalBody pb={6}>
        <UI.VStack
          as="form"
          onSubmit={handleSubmit}
          align="stretch"
          spacing={3}
        >
          <UI.FormControl>
            <UI.FormLabel>Group name</UI.FormLabel>
            <UI.Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </UI.FormControl>
          <UI.Button
            type="submit"
            preset="primary"
            isDisabled={!name.trim() || name.trim() === group.name}
            isLoading={saving}
            loadingText="Saving…"
          >
            Save
          </UI.Button>
        </UI.VStack>
      </UI.ModalBody>
    </UI.QuickModal>
  );
};

/* ------------------------------------------------------------------ */
/* Join prompt (explicit consent — no silent auto-join)                */
/* ------------------------------------------------------------------ */

const JoinPrompt: React.FC<{
  group: Group;
  onJoin: () => Promise<void>;
  joining: boolean;
}> = ({ group, onJoin, joining }) => {
  const toast = UI.useToast();

  const handleJoin = async () => {
    try {
      await onJoin();
    } catch {
      toast({
        title: "Couldn't join the group",
        description: 'Check your connection and try again.',
        status: 'error',
      });
    }
  };

  return (
    <UI.Box flex={1} overflowY="auto">
      <UI.EmptyState
        icon={faUserPlus}
        title={`Join ${group.name}?`}
        description="You've been invited to this group. Members can read and post messages."
        action={
          <UI.VStack spacing={2}>
            <UI.Button
              preset="primary"
              onClick={handleJoin}
              isLoading={joining}
              loadingText="Joining…"
              data-testid="join-group"
            >
              Join group
            </UI.Button>
            <UI.RouteButton route={routes.home()} variant="ghost" size="sm">
              Not now
            </UI.RouteButton>
          </UI.VStack>
        }
      />
    </UI.Box>
  );
};

/* ------------------------------------------------------------------ */
/* Chat: scrolling message list + bottom composer                      */
/* ------------------------------------------------------------------ */

/** Suppress the author header when the same person posts within 5 minutes. */
const GROUPING_WINDOW_MS = 5 * 60 * 1000;

type ChatItem = Message & { pending?: boolean };

const GroupChat: React.FC<{
  groupId: string;
  group: Group;
  user: AppUser;
}> = ({ groupId, group, user }) => {
  const [messages, loading, error] = useGroupMessages(groupId, { limit: 100 });
  const [pendingMessages, setPendingMessages] = React.useState<ChatItem[]>([]);

  useChirpOnNewMessages(messages, groupId);

  // Drop pending copies once the server round-trips them back.
  React.useEffect(() => {
    if (!messages?.length) return;
    setPendingMessages((pending) =>
      pending.filter(
        (pm) =>
          !messages.some(
            (m) =>
              m.uid === pm.uid &&
              m.text === pm.text &&
              m.time >= pm.time - 60_000
          )
      )
    );
  }, [messages]);

  const sendMessage = async (text: string) => {
    const temp: ChatItem = {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      uid: user.uid,
      authorName: user.displayName,
      authorPhotoURL: resolveAppUserPhotoURL(user),
      time: Date.now(),
      text,
      groupId,
      pending: true,
    };
    setPendingMessages((p) => [...p, temp]);
    try {
      await addMessage({
        uid: user.uid,
        authorName: user.displayName,
        authorPhotoURL: resolveAppUserPhotoURL(user),
        text,
        groupId,
      });
    } catch (e) {
      setPendingMessages((p) => p.filter((m) => m.id !== temp.id));
      throw e;
    }
  };

  const items: ChatItem[] = [...(messages ?? []), ...pendingMessages];

  return (
    <React.Fragment>
      <ChatScrollArea
        items={items}
        loading={loading}
        error={error}
        groupName={group.name}
        currentUid={user.uid}
      />
      <UI.Box
        flexShrink={0}
        px={4}
        pt={3}
        pb="var(--app-composer-pb, calc(0.75rem + env(safe-area-inset-bottom, 0px)))"
        borderTop="1px solid"
        borderColor="border.subtle"
        bg="surface.raised"
      >
        <UI.Box maxW="760px" mx="auto">
          <Composer onSend={sendMessage} />
        </UI.Box>
      </UI.Box>
    </React.Fragment>
  );
};

const ChatScrollArea: React.FC<{
  items: ChatItem[];
  loading: boolean;
  error: Error | undefined;
  groupName: string;
  currentUid: string;
}> = ({ items, loading, error, groupName, currentUid }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const didInitialScroll = React.useRef(false);
  const lastItem = items[items.length - 1];

  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !items.length) return;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    const ownMessageArrived = lastItem?.uid === currentUid;

    if (!didInitialScroll.current) {
      el.scrollTop = el.scrollHeight;
      didInitialScroll.current = true;
    } else if (nearBottom || ownMessageArrived) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  if (loading) {
    return (
      <UI.Box flex={1} overflowY="auto" p={4} maxW="760px" w="full" mx="auto">
        <UI.VStack align="stretch" spacing={4}>
          <UI.SkeletonText noOfLines={2} spacing={3} />
          <UI.SkeletonText noOfLines={3} spacing={3} />
          <UI.SkeletonText noOfLines={2} spacing={3} />
        </UI.VStack>
      </UI.Box>
    );
  }

  if (error) {
    return (
      <UI.Box flex={1} overflowY="auto">
        <UI.ErrorState
          title="Couldn't load messages"
          onRetry={() => window.location.reload()}
        />
      </UI.Box>
    );
  }

  if (!items.length) {
    return (
      <UI.Box flex={1} overflowY="auto">
        <UI.EmptyState
          icon={faComments}
          title={`Say hi — this is the start of ${groupName}`}
          description="Messages show up here for everyone in the group."
        />
      </UI.Box>
    );
  }

  return (
    <UI.Box
      ref={scrollRef}
      flex={1}
      minH={0}
      overflowY="auto"
      overscrollBehavior="contain"
      px={4}
      py={3}
    >
      <UI.VStack align="stretch" spacing={0} maxW="760px" mx="auto">
        {items.map((message, i) => {
          const prev = items[i - 1];
          const grouped =
            !!prev &&
            prev.uid === message.uid &&
            message.time - prev.time < GROUPING_WINDOW_MS;
          return (
            <MessageRow
              key={message.id}
              message={message}
              grouped={grouped}
              isOwn={message.uid === currentUid}
            />
          );
        })}
      </UI.VStack>
    </UI.Box>
  );
};

export const MessageRow: React.FC<{
  message: ChatItem;
  grouped: boolean;
  isOwn: boolean;
}> = ({ message, grouped, isOwn }) => {
  return (
    <UI.HStack
      align="flex-start"
      spacing={3}
      px={3}
      pt={grouped ? 0.5 : 3}
      pb={0.5}
      borderRadius="lg"
      opacity={message.pending ? 0.55 : 1}
      _hover={{ bg: 'surface.sunken' }}
      sx={{
        animation: 'hork-message-in 160ms ease-out',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        '@keyframes hork-message-in': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: message.pending ? 0.55 : 1, transform: 'none' },
        },
      }}
    >
      {grouped ? (
        <UI.Box w={8} flexShrink={0} />
      ) : (
        <UserAvatar
          name={message.authorName || ''}
          seed={message.uid}
          photoURL={message.authorPhotoURL}
          size="sm"
          mt={1}
        />
      )}
      <UI.Box minW={0} flex={1}>
        {grouped ? null : (
          <UI.HStack spacing={2} align="baseline" mb={0.5}>
            <UI.Text fontSize="sm" fontWeight="bold" noOfLines={1}>
              {message.authorName || 'Someone'}
              {isOwn ? ' (you)' : ''}
            </UI.Text>
            <UI.Text fontSize="xs" color="text.muted" flexShrink={0}>
              {message.pending
                ? 'sending…'
                : `${formatDistanceToNow(message.time)} ago`}
            </UI.Text>
          </UI.HStack>
        )}
        <UI.RichTextContent content={message.text} />
      </UI.Box>
    </UI.HStack>
  );
};

const Composer: React.FC<{ onSend: (text: string) => Promise<void> }> = ({
  onSend,
}) => {
  const [text, setText] = React.useState('');
  const toast = UI.useToast();
  const canSend = !!text.trim();

  const handleSend = async () => {
    if (!canSend) return;
    const outgoing = text;
    // Clear immediately — the pending bubble takes over (optimistic send).
    setText('');
    try {
      await onSend(outgoing);
    } catch {
      setText(outgoing);
      toast({
        title: "Message didn't send",
        description: 'Check your connection and try again.',
        status: 'error',
      });
    }
  };

  return (
    <UI.Box position="relative">
      <UI.RichTextEditor
        value={text}
        onChange={setText}
        onSubmit={handleSend}
      />
      <UI.Box position="absolute" bottom={2} right={2}>
        <UI.IconButton
          aria-label="Send"
          icon={faPaperPlane}
          colorScheme="action"
          variant="solid"
          size="sm"
          onClick={handleSend}
          isDisabled={!canSend}
        />
      </UI.Box>
    </UI.Box>
  );
};

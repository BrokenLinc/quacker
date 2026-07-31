import { useChirpOnNewMessages } from '@@lib/notifications/chirp';
import type { NotifyLevel } from '@@lib/notifications/shouldNotify';
import {
  updateMyNotifyLevel,
} from '@@lib/notifications/prefs';
import { getShareUrl } from '@@lib/share';
import {
  Group,
  Message,
  addMessage,
  deleteGroup,
  isGroupMember,
  joinGroup,
  leaveGroup,
  markGroupViewed,
  removeGroupMember,
  updateGroup,
  useGroup,
  useGroupMembers,
  useGroupMessages,
} from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { NotifyLevelControl } from '@@components/NotifyLevelControl';
import { notifyLevelLabel } from '@@lib/notifications/notifyLevel';
import { UserAvatar } from '@@components/UserAvatar';
import { UserMenu } from '@@components/UserMenu';
import { useConfirmation } from '@@dialogs/confirmation';
import {
  formatAuthorLabel,
  formatJoinedAt,
  formatMessageDayLabel,
  formatMessageTime,
  localDayKey,
} from '@@lib/chat/messageTime';
import {
  AppUser,
  phoneLast4FromPhone,
  resolveAppUserPhotoURL,
  useAuthState,
} from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import {
  faArrowLeft,
  faBell,
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
import React from 'react';
import QRCode from 'react-qr-code';
import { useNavigate, useParams } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/* Top bar shell (defined before page so auth loading can reuse it)    */
/* ------------------------------------------------------------------ */

/** sm IconButton (2rem) + py (0.5rem×2); mobile adds safe-area to pt. */
const GROUP_BAR_MIN_H = {
  base: 'calc(3rem + env(safe-area-inset-top, 0px))',
  md: '3rem',
} as const;

/**
 * Stable group chrome frame — mount immediately at known size, then fill
 * children when data/auth is ready (avoids header pop-in).
 */
const GroupBarShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <UI.HStack
    px={3}
    pt={{
      base: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
      md: 2,
    }}
    pb={2}
    spacing={2}
    flexShrink={0}
    minH={GROUP_BAR_MIN_H}
    align="center"
    borderBottom="1px solid"
    borderColor="border.subtle"
    bg="surface.raised"
  >
    {children}
  </UI.HStack>
);

const GroupBarBackButton: React.FC = () => (
  <UI.IconButton
    as={UI.RouteLink}
    route={routes.home()}
    aria-label="Back to home"
    icon={faArrowLeft}
    size="sm"
    variant="ghost"
    color="inherit"
  />
);

/** Placeholder chrome while group/auth loads — same slots as the real bar. */
const GroupBarPlaceholder: React.FC = () => {
  const isMobile = UI.useBreakpointValue(
    { base: true, md: false },
    { ssr: false, fallback: 'base' }
  );

  return (
    <React.Fragment>
      {isMobile ? <GroupBarBackButton /> : null}
      <UI.Skeleton h={5} flex={1} maxW="12rem" borderRadius="md" mr="auto" />
      <UI.Skeleton boxSize={8} borderRadius="md" flexShrink={0} />
      {isMobile ? (
        <UI.Skeleton boxSize={8} borderRadius="full" flexShrink={0} />
      ) : null}
    </React.Fragment>
  );
};

const GroupChatBodySkeleton: React.FC = () => (
  <UI.Box
    flex={1}
    minH={0}
    overflowY="auto"
    p={4}
    maxW="760px"
    w="full"
    mx="auto"
  >
    <UI.VStack align="stretch" spacing={4}>
      <UI.SkeletonText noOfLines={3} spacing={3} />
      <UI.SkeletonText noOfLines={2} spacing={3} />
      <UI.SkeletonText noOfLines={3} spacing={3} />
    </UI.VStack>
  </UI.Box>
);

/** Full-page loading chrome: fixed bar + message skeletons. */
const GroupPageLoadingChrome: React.FC = () => (
  <React.Fragment>
    <GroupBarShell>
      <GroupBarPlaceholder />
    </GroupBarShell>
    <GroupChatBodySkeleton />
  </React.Fragment>
);

const GroupPage: React.FC = () => {
  const { groupId } = useParams() as { groupId: string };

  return (
    <RequireAuth loadingFallback={<GroupPageLoadingChrome />}>
      {/* key resets chat state when switching groups via the sidebar */}
      <GroupPageContents key={groupId} groupId={groupId} />
    </RequireAuth>
  );
};
export default GroupPage;

const GroupPageContents: React.FC<{ groupId: string }> = ({ groupId }) => {
  const state = useGroupState(groupId);
  const { user, group, loading, error, member } = state;
  const waiting = loading || (member === null && !error);
  const ready = Boolean(group && user && !waiting && !error);

  return (
    <React.Fragment>
      {/* Bar shell mounts immediately at known size; contents fill when ready. */}
      <GroupBarShell>
        {ready && group && user ? (
          <GroupBarContents
            group={group}
            user={user}
            isMember={member === true}
          />
        ) : (
          <GroupBarPlaceholder />
        )}
      </GroupBarShell>
      {waiting ? (
        <GroupChatBodySkeleton />
      ) : error ? (
        <UI.Box flex={1} minH={0} overflowY="auto">
          <UI.ErrorState
            title="Couldn't load this room"
            onRetry={() => window.location.reload()}
          />
        </UI.Box>
      ) : !group || !user ? (
        <UI.Box flex={1} minH={0} overflowY="auto">
          <UI.EmptyState
            icon={faComments}
            title="Room not found"
            description="This room may have been deleted, or the link is wrong."
            action={
              <UI.RouteButton route={routes.home()} variant="outline">
                Back home
              </UI.RouteButton>
            }
          />
        </UI.Box>
      ) : member ? (
        <GroupChat groupId={groupId} group={group} user={user} />
      ) : (
        <JoinPrompt
          group={group}
          onJoin={state.join}
          joining={state.joining}
        />
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

  const join = async (notifyLevel: NotifyLevel = 'all') => {
    if (!user) return;
    setJoining(true);
    try {
      await joinGroup(groupId, {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: resolveAppUserPhotoURL(user),
        phoneLast4: phoneLast4FromPhone(user.phone),
        notifyLevel,
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

const GroupBarContents: React.FC<{
  group: Group;
  user: AppUser;
  isMember: boolean;
}> = ({ group, user, isMember }) => {
  const isMobile = UI.useBreakpointValue(
    { base: true, md: false },
    { ssr: false, fallback: 'base' }
  );
  const shareModal = UI.useDisclosure();

  return (
    <React.Fragment>
      {isMobile ? <GroupBarBackButton /> : null}
      {isMember ? (
        <GroupOverflowMenu
          group={group}
          user={user}
          onInvite={shareModal.onOpen}
        />
      ) : (
        <UI.Heading size="sm" noOfLines={1} mr="auto">
          <UI.Text as="span" data-testid="group-title">
            {group.name}
          </UI.Text>
        </UI.Heading>
      )}
      <UI.IconButton
        aria-label="Invite or Share"
        icon={faUserPlus}
        variant="ghost"
        size="sm"
        onClick={shareModal.onOpen}
      />
      {isMobile ? <UserMenu showColorMode /> : null}
      <ShareGroupModal group={group} {...shareModal} />
    </React.Fragment>
  );
};

const ShareGroupModal: React.FC<{
  group: Group;
  isOpen: boolean;
  onClose: () => void;
}> = ({ group, isOpen, onClose }) => {
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
    <UI.QuickModal
      headerContent={
        <React.Fragment>
          <UI.Icon icon={faQrcode} mr={2} />
          Share {group.name}
        </React.Fragment>
      }
      size="md"
      isOpen={isOpen}
      onClose={onClose}
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
  );
};

const GroupOverflowMenu: React.FC<{
  group: Group;
  user: AppUser;
  onInvite: () => void;
}> = ({ group, user, onInvite }) => {
  const isCreator = group.uid === user.uid;
  const membersModal = UI.useDisclosure();
  const renameModal = UI.useDisclosure();
  const notifyModal = UI.useDisclosure();
  const sheet = UI.useDisclosure();
  const confirmation = useConfirmation();
  const toast = UI.useToast();
  const navigate = useNavigate();
  const isMobile = UI.useBreakpointValue(
    { base: true, md: false },
    { ssr: false }
  );
  const [members] = useGroupMembers(group.id, { channelId: 'overflow' });
  const myMember = members?.find((m) => m.uid === user.uid);
  const notifyLevel = myMember?.notifyLevel ?? 'all';

  const handleLeave = () => {
    confirmation.open({
      title: `Leave ${group.name}?`,
      message: 'You can rejoin any time with an invite link.',
      confirmLabel: 'Leave room',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await leaveGroup(group.id, user.uid);
          navigate(routes.home().path);
          toast({ title: `Left ${group.name}`, duration: 2500 });
        } catch {
          toast({ title: "Couldn't leave the room", status: 'error' });
        }
      },
      onCancel: () => undefined,
    });
  };

  const handleDelete = () => {
    confirmation.open({
      title: `Delete ${group.name}?`,
      message: 'This deletes the room and all its messages for everyone.',
      confirmLabel: 'Delete room',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteGroup(group.id);
          navigate(routes.home().path);
          toast({ title: `Deleted ${group.name}`, duration: 2500 });
        } catch {
          toast({ title: "Couldn't delete the room", status: 'error' });
        }
      },
      onCancel: () => undefined,
    });
  };

  const sheetItems: UI.ActionSheetItem[] = [
    {
      id: 'invite',
      label: 'Invite or Share',
      icon: faUserPlus,
      onClick: onInvite,
    },
    {
      id: 'members',
      label: 'Members',
      icon: faUsers,
      onClick: membersModal.onOpen,
    },
    {
      id: 'notify',
      label: `Notifications · ${notifyLevelLabel(notifyLevel)}`,
      icon: faBell,
      onClick: notifyModal.onOpen,
    },
  ];
  if (isCreator) {
    sheetItems.push({
      id: 'rename',
      label: 'Rename room',
      icon: faPenToSquare,
      onClick: renameModal.onOpen,
    });
    sheetItems.push({
      id: 'delete',
      label: 'Delete room',
      icon: faTrash,
      isDestructive: true,
      onClick: handleDelete,
    });
  } else {
    sheetItems.push({
      id: 'leave',
      label: 'Leave room',
      icon: faRightFromBracket,
      isDestructive: true,
      onClick: handleLeave,
    });
  }

  const openInviteFromMembers = () => {
    membersModal.onClose();
    onInvite();
  };

  const modals = (
    <React.Fragment>
      <MembersModal
        group={group}
        user={user}
        isOpen={membersModal.isOpen}
        onClose={membersModal.onClose}
        onInvite={openInviteFromMembers}
      />
      <RenameGroupModal
        group={group}
        isOpen={renameModal.isOpen}
        onClose={renameModal.onClose}
      />
      <GroupNotifyLevelModal
        group={group}
        user={user}
        level={notifyLevel}
        isOpen={notifyModal.isOpen}
        onClose={notifyModal.onClose}
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
            icon={<UI.Icon icon={faUserPlus} />}
            onClick={onInvite}
          >
            Invite or Share
          </UI.MenuItem>
          <UI.MenuItem
            fontSize="sm"
            icon={<UI.Icon icon={faUsers} />}
            onClick={membersModal.onOpen}
          >
            Members
          </UI.MenuItem>
          <UI.MenuItem
            fontSize="sm"
            icon={<UI.Icon icon={faBell} />}
            onClick={notifyModal.onOpen}
          >
            Notifications · {notifyLevelLabel(notifyLevel)}
          </UI.MenuItem>
          {isCreator ? (
            <UI.MenuItem
              fontSize="sm"
              icon={<UI.Icon icon={faPenToSquare} />}
              onClick={renameModal.onOpen}
            >
              Rename room
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
              Delete room
            </UI.MenuItem>
          ) : (
            <UI.MenuItem
              fontSize="sm"
              color="red.500"
              icon={<UI.Icon icon={faRightFromBracket} />}
              onClick={handleLeave}
            >
              Leave room
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
  onInvite: () => void;
}> = ({ group, user, isOpen, onClose, onInvite }) => {
  return (
    <UI.QuickModal isOpen={isOpen} onClose={onClose} headerContent="Members">
      <UI.ModalBody pb={6}>
        <UI.HStack justify="flex-end" mb={2}>
          <UI.IconButton
            aria-label="Invite or Share"
            icon={faUserPlus}
            size="sm"
            variant="ghost"
            onClick={onInvite}
          />
        </UI.HStack>
        {isOpen ? <MembersList group={group} user={user} /> : null}
      </UI.ModalBody>
    </UI.QuickModal>
  );
};

const MembersList: React.FC<{ group: Group; user: AppUser }> = ({
  group,
  user,
}) => {
  const [members, loading, error] = useGroupMembers(group.id, {
    channelId: 'members-list',
  });
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
        title: "Couldn't rename the room",
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
      headerContent="Rename room"
    >
      <UI.ModalBody pb={6}>
        <UI.VStack
          as="form"
          onSubmit={handleSubmit}
          align="stretch"
          spacing={3}
        >
          <UI.FormControl>
            <UI.FormLabel>Room name</UI.FormLabel>
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
  onJoin: (notifyLevel: NotifyLevel) => Promise<void>;
  joining: boolean;
}> = ({ group, onJoin, joining }) => {
  const toast = UI.useToast();
  const [notifyLevel, setNotifyLevel] = React.useState<NotifyLevel>('all');

  const handleJoin = async () => {
    try {
      await onJoin(notifyLevel);
    } catch {
      toast({
        title: "Couldn't join the room",
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
        description="You've been invited to this room. Members can read and post messages."
        action={
          <UI.VStack spacing={4} align="stretch" maxW="320px" w="full">
            <NotifyLevelControl
              value={notifyLevel}
              onChange={setNotifyLevel}
            />
            <UI.Button
              preset="primary"
              onClick={handleJoin}
              isLoading={joining}
              loadingText="Joining…"
              data-testid="join-group"
            >
              Join room
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

const GroupNotifyLevelModal: React.FC<{
  group: Group;
  user: AppUser;
  level: NotifyLevel;
  isOpen: boolean;
  onClose: () => void;
}> = ({ group, user, level, isOpen, onClose }) => {
  const [value, setValue] = React.useState<NotifyLevel>(level);
  const [saving, setSaving] = React.useState(false);
  const toast = UI.useToast();

  React.useEffect(() => {
    if (isOpen) setValue(level);
  }, [isOpen, level]);

  const save = async () => {
    setSaving(true);
    try {
      await updateMyNotifyLevel(group.id, user.uid, value);
      toast({ title: 'Notification preference saved', duration: 2500 });
      onClose();
    } catch {
      toast({
        title: "Couldn't save preference",
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
      headerContent="Room notifications"
    >
      <UI.ModalBody pb={6}>
        <UI.VStack align="stretch" spacing={4}>
          <NotifyLevelControl value={value} onChange={setValue} />
          <UI.Button
            preset="primary"
            onClick={() => void save()}
            isLoading={saving}
            isDisabled={value === level}
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
/* Chat: scrolling message list + bottom composer                      */
/* ------------------------------------------------------------------ */

/** Suppress the author header when the same person posts within 5 minutes. */
const GROUPING_WINDOW_MS = 5 * 60 * 1000;

type ChatItem = Message & { pending?: boolean };

type MemberProfile = {
  displayName: string | null;
  photoURL: string | null;
  phoneLast4: string | null;
  joinedAt: number | null;
  role: 'creator' | 'member' | null;
};

type MemberProfileTarget = {
  name: string;
  uid: string;
  photoURL: string | null;
  phoneLast4: string | null;
  joinedAt: number | null;
  role: 'creator' | 'member' | null;
  isOwn: boolean;
};

const GroupChat: React.FC<{
  groupId: string;
  group: Group;
  user: AppUser;
}> = ({ groupId, group, user }) => {
  const [messages, loading, error] = useGroupMessages(groupId, { limit: 100 });
  const [members] = useGroupMembers(groupId, { channelId: 'chat' });
  const [pendingMessages, setPendingMessages] = React.useState<ChatItem[]>([]);

  const memberByUid = (() => {
    const map = new Map<string, MemberProfile>();
    for (const m of members ?? []) {
      map.set(m.uid, {
        displayName: m.displayName,
        photoURL: m.photoURL,
        phoneLast4: m.phoneLast4,
        joinedAt: m.joinedAt,
        role: m.role,
      });
    }
    // Prefer the signed-in user's live auth profile for own messages.
    const existing = map.get(user.uid);
    map.set(user.uid, {
      displayName: user.displayName,
      photoURL: resolveAppUserPhotoURL(user),
      phoneLast4:
        phoneLast4FromPhone(user.phone) ?? existing?.phoneLast4 ?? null,
      joinedAt: existing?.joinedAt ?? null,
      role: existing?.role ?? null,
    });
    return map;
  })();

  useChirpOnNewMessages(messages, groupId);

  // Clear unread while the user is actively viewing this group.
  React.useEffect(() => {
    const mark = () => {
      if (document.visibilityState !== 'visible') return;
      void markGroupViewed(groupId, user.uid).catch(() => undefined);
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [groupId, user.uid, messages?.length]);

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
      isAnnouncement: false,
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
        memberByUid={memberByUid}
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
  memberByUid: Map<string, MemberProfile>;
}> = ({ items, loading, error, groupName, currentUid, memberByUid }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const didInitialScroll = React.useRef(false);
  const distanceFromBottomRef = React.useRef(0);
  const lastItem = items[items.length - 1];
  const [profileTarget, setProfileTarget] =
    React.useState<MemberProfileTarget | null>(null);

  const openProfile = (target: MemberProfileTarget) => {
    setProfileTarget(target);
  };
  const closeProfile = () => setProfileTarget(null);

  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !items.length) return;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    const ownMessageArrived = lastItem?.uid === currentUid;

    if (!didInitialScroll.current) {
      el.scrollTop = el.scrollHeight;
      didInitialScroll.current = true;
      distanceFromBottomRef.current = 0;
    } else if (nearBottom || ownMessageArrived) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      distanceFromBottomRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Keep scroll anchored to the viewport bottom across keyboard resize.
  const hasItems = items.length > 0;
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasItems) return;

    const onScroll = () => {
      distanceFromBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight;
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      const distance = distanceFromBottomRef.current;
      el.scrollTop = el.scrollHeight - el.clientHeight - distance;
    });
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [hasItems]);

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
          description="Messages show up here for everyone in the room."
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
      overscrollBehavior="auto"
      px={4}
      pt={3}
      pb={10}
    >
      <UI.VStack align="stretch" spacing={0} maxW="760px" mx="auto">
        {items.map((message, i) => {
          const prev = items[i - 1];
          const showDayDivider =
            !prev || localDayKey(prev.time) !== localDayKey(message.time);
          const grouped =
            !!prev &&
            !showDayDivider &&
            prev.uid === message.uid &&
            message.time - prev.time < GROUPING_WINDOW_MS;
          const member = memberByUid.get(message.uid);
          return (
            <React.Fragment key={message.id}>
              {showDayDivider ? (
                <MessageDayDivider time={message.time} />
              ) : null}
              <MessageRow
                message={message}
                grouped={grouped}
                isOwn={message.uid === currentUid}
                liveDisplayName={member?.displayName ?? message.authorName}
                livePhotoURL={member?.photoURL ?? message.authorPhotoURL}
                phoneLast4={member?.phoneLast4 ?? null}
                joinedAt={member?.joinedAt ?? null}
                role={member?.role ?? null}
                onOpenProfile={openProfile}
              />
            </React.Fragment>
          );
        })}
      </UI.VStack>
      {profileTarget ? (
        <MemberProfileModal
          isOpen
          onClose={closeProfile}
          name={profileTarget.name}
          uid={profileTarget.uid}
          photoURL={profileTarget.photoURL}
          phoneLast4={profileTarget.phoneLast4}
          joinedAt={profileTarget.joinedAt}
          role={profileTarget.role}
          isOwn={profileTarget.isOwn}
        />
      ) : null}
    </UI.Box>
  );
};

const MessageDayDivider: React.FC<{ time: number }> = ({ time }) => (
  <UI.Flex align="center" gap={3} py={3} px={3} role="separator">
    <UI.Box flex={1} h="1px" bg="border.subtle" />
    <UI.Text fontSize="xs" color="text.muted" flexShrink={0} fontWeight="medium">
      {formatMessageDayLabel(time)}
    </UI.Text>
    <UI.Box flex={1} h="1px" bg="border.subtle" />
  </UI.Flex>
);

export const MessageRow: React.FC<{
  message: ChatItem;
  grouped: boolean;
  isOwn: boolean;
  liveDisplayName?: string | null;
  livePhotoURL?: string | null;
  phoneLast4?: string | null;
  joinedAt?: number | null;
  role?: 'creator' | 'member' | null;
  onOpenProfile: (target: MemberProfileTarget) => void;
}> = ({
  message,
  grouped,
  isOwn,
  liveDisplayName,
  livePhotoURL,
  phoneLast4,
  joinedAt,
  role,
  onOpenProfile,
}) => {
  const displayName = liveDisplayName ?? message.authorName;
  const photoURL = livePhotoURL ?? message.authorPhotoURL;
  const name = formatAuthorLabel(displayName);
  const profileLabel = `View ${name}'s profile`;

  const open = () =>
    onOpenProfile({
      name,
      uid: message.uid,
      photoURL: photoURL ?? null,
      phoneLast4: phoneLast4 ?? null,
      joinedAt: joinedAt ?? null,
      role: role ?? null,
      isOwn,
    });

  return (
    <UI.HStack
      align="flex-start"
      spacing={3}
      px={3}
      pt={grouped ? 0.5 : 3}
      pb={0.5}
      borderRadius="lg"
      opacity={message.pending ? 0.55 : 1}
      sx={{
        animation: 'yowl-message-in 160ms ease-out',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        '@keyframes yowl-message-in': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: message.pending ? 0.55 : 1, transform: 'none' },
        },
      }}
    >
      {grouped ? (
        <UI.Box w={8} flexShrink={0} />
      ) : (
        <UI.Box
          as="button"
          type="button"
          onClick={open}
          aria-label={profileLabel}
          borderRadius="full"
          lineHeight={0}
          cursor="pointer"
          flexShrink={0}
          mt={1}
          _hover={{ opacity: 0.85 }}
          _active={{ transform: 'translateY(1px)' }}
        >
          <UserAvatar
            name={name}
            seed={message.uid}
            photoURL={photoURL}
            size="sm"
          />
        </UI.Box>
      )}
      <UI.Box minW={0} flex={1}>
        {grouped ? null : (
          <UI.HStack spacing={2} align="baseline" mb={0.5}>
            <UI.Button
              variant="link"
              color="inherit"
              fontSize="sm"
              fontWeight="bold"
              h="auto"
              minW={0}
              maxW="100%"
              p={0}
              textDecoration="none"
              _hover={{ textDecoration: 'underline' }}
              onClick={open}
              aria-label={profileLabel}
            >
              <UI.Text as="span" noOfLines={1}>
                {name}
                {isOwn ? ' (you)' : ''}
              </UI.Text>
            </UI.Button>
            <UI.Text fontSize="xs" color="text.muted" flexShrink={0}>
              {message.pending ? 'sending…' : formatMessageTime(message.time)}
            </UI.Text>
          </UI.HStack>
        )}
        <UI.RichTextContent content={message.text} />
      </UI.Box>
    </UI.HStack>
  );
};

const MemberProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  name: string;
  uid: string;
  photoURL: string | null;
  phoneLast4: string | null;
  joinedAt: number | null;
  role: 'creator' | 'member' | null;
  isOwn: boolean;
}> = ({
  isOpen,
  onClose,
  name,
  uid,
  photoURL,
  phoneLast4,
  joinedAt,
  role,
  isOwn,
}) => {
  const title = isOwn ? 'You' : name;
  return (
    <UI.QuickModal isOpen={isOpen} onClose={onClose} headerContent={title}>
      <UI.ModalBody pb={8}>
        <UI.VStack spacing={3} align="center" textAlign="center" pt={2}>
          <UserAvatar name={name} seed={uid} photoURL={photoURL} size="xl" />
          <UI.Heading size="md" noOfLines={2}>
            {name}
            {isOwn ? ' (you)' : ''}
          </UI.Heading>
          {phoneLast4 ? (
            <UI.Text fontSize="md" color="text.muted" letterSpacing="wide">
              ···{phoneLast4}
            </UI.Text>
          ) : null}
          {role === 'creator' ? (
            <UI.Badge colorScheme="gray" fontSize="xs">
              Room creator
            </UI.Badge>
          ) : null}
          {joinedAt ? (
            <UI.Text fontSize="sm" color="text.muted">
              Joined {formatJoinedAt(joinedAt)}
            </UI.Text>
          ) : null}
        </UI.VStack>
      </UI.ModalBody>
    </UI.QuickModal>
  );
};

const MESSAGE_MAX_LENGTH = 140;

const Composer: React.FC<{ onSend: (text: string) => Promise<void> }> = ({
  onSend,
}) => {
  const [text, setText] = React.useState('');
  const toast = UI.useToast();
  const canSend = !!text.trim() && text.length <= MESSAGE_MAX_LENGTH;

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
        maxLength={MESSAGE_MAX_LENGTH}
      />
      {text.length > 0 ? (
        <UI.Text
          position="absolute"
          bottom={3}
          right={14}
          fontSize="xs"
          color={text.length > MESSAGE_MAX_LENGTH ? 'red.500' : 'text.muted'}
          pointerEvents="none"
        >
          {text.length}/{MESSAGE_MAX_LENGTH}
        </UI.Text>
      ) : null}
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

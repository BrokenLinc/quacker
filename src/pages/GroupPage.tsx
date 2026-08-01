import { useChirpOnNewMessages } from '@@lib/notifications/chirp';
import type { NotifyLevel } from '@@lib/notifications/shouldNotify';
import { updateMyNotifyLevel, usePushEnabled } from '@@lib/notifications/prefs';
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
  setMemberMod,
  setMemberSilenced,
  updateGroup,
  useGroup,
  useGroupMembers,
  useGroupMessages,
  useGroupSilences,
} from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { NotificationsSwitch } from '@@components/NotificationsSwitch';
import { NotifyLevelControl } from '@@components/NotifyLevelControl';
import { notifyLevelLabel } from '@@lib/notifications/notifyLevel';
import {
  canManageMember,
  isStaffRole,
  type GroupMemberRole,
} from '@@lib/moderation/memberPermissions';
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
  faCheck,
  faComments,
  faCopy,
  faEllipsisVertical,
  faPaperPlane,
  faPenToSquare,
  faRightFromBracket,
  faShareFromSquare,
  faTrash,
  faUserPlus,
  faUsers,
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
    <RequireAuth
      invite
      heading="Sign in to join this room"
      loadingFallback={<GroupPageLoadingChrome />}
    >
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
        aria-label="Invite someone"
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
    <UI.QuickModal size="md" isOpen={isOpen} onClose={onClose}>
      <UI.ModalBody px={6} pb={6}>
        <UI.VStack spacing={6} align="center">
          <UI.Text
            fontSize="sm"
            color="text.muted"
            textAlign="center"
            maxW="280px"
          >
            Point your camera at the code to join {group.name}
          </UI.Text>
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
          <UI.VStack spacing={3} w="100%" align="center">
            <UI.Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
              {shareUrl}
            </UI.Text>
            <UI.ButtonGroup size="sm">
              <UI.Button
                variant="outline"
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
  const [menuOpen, setMenuOpen] = React.useState(false);
  const confirmation = useConfirmation();
  const toast = UI.useToast();
  const navigate = useNavigate();
  const [members] = useGroupMembers(group.id, { channelId: 'overflow' });
  const myMember = members?.find((m) => m.uid === user.uid);
  const isStaff = isStaffRole(myMember?.role ?? null, isCreator);
  const notifyLevel = myMember?.notifyLevel ?? 'all';
  const [pushEnabled] = usePushEnabled(user.uid);

  const closeMenu = () => setMenuOpen(false);

  const runAndClose = (action: () => void) => {
    closeMenu();
    action();
  };

  const handleLeave = () => {
    closeMenu();
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
    closeMenu();
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

  const openInviteFromMembers = () => {
    membersModal.onClose();
    onInvite();
  };

  return (
    <React.Fragment>
      <UI.MorphingPopover
        open={menuOpen}
        onOpenChange={setMenuOpen}
        flex={1}
        minW={0}
        maxW="100%"
        justifyContent="flex-start"
        display="flex"
        anchor="top left"
      >
        <UI.MorphingPopoverTrigger
          aria-label={`${group.name} options`}
          maxW="100%"
          minW={0}
          px={2}
          py={1}
          h="auto"
          fontWeight="bold"
          fontSize="md"
          justifyContent="flex-start"
          gap={2}
        >
          <UI.Text as="span" noOfLines={1} data-testid="group-title" minW={0}>
            {group.name}
          </UI.Text>
          <UI.Icon
            icon={faEllipsisVertical}
            boxSize={3}
            color="text.muted"
            flexShrink={0}
          />
        </UI.MorphingPopoverTrigger>
        <UI.MorphingPopoverContent title="Room options">
          <UI.VStack align="stretch" spacing={0} py={1}>
            <UI.PopoverMenuRow
              icon={faUserPlus}
              label="Invite someone"
              onClick={() => runAndClose(onInvite)}
            />
            <UI.PopoverMenuRow
              icon={faUsers}
              label="Members"
              onClick={() => runAndClose(membersModal.onOpen)}
            />
            <UI.PopoverMenuRow
              icon={faBell}
              label={
                pushEnabled
                  ? `Notifications · ${notifyLevelLabel(notifyLevel)}`
                  : 'Notifications · Off'
              }
              onClick={() => runAndClose(notifyModal.onOpen)}
            />
            {isStaff ? (
              <UI.PopoverMenuRow
                icon={faPenToSquare}
                label="Rename room"
                onClick={() => runAndClose(renameModal.onOpen)}
              />
            ) : null}
            <UI.Box borderTopWidth="1px" borderColor="border.subtle" my={1} />
            {isCreator ? (
              <UI.PopoverMenuRow
                icon={faTrash}
                label="Delete room"
                isDestructive
                onClick={handleDelete}
              />
            ) : (
              <UI.PopoverMenuRow
                icon={faRightFromBracket}
                label="Leave room"
                isDestructive
                onClick={handleLeave}
              />
            )}
          </UI.VStack>
        </UI.MorphingPopoverContent>
      </UI.MorphingPopover>

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
    <UI.QuickModal
      isOpen={isOpen}
      onClose={onClose}
      headerContent={
        <UI.HStack justify="space-between" align="center" w="100%" pr={8}>
          <UI.Text as="span">Room members</UI.Text>
          <UI.Button size="sm" variant="outline" onClick={onInvite}>
            Invite
          </UI.Button>
        </UI.HStack>
      }
    >
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
  const [members, loading, error] = useGroupMembers(group.id, {
    channelId: 'members-list',
  });
  const [silences, silencesLoading] = useGroupSilences(group.id, {
    channelId: 'members-list-silences',
  });
  const isCreator = group.uid === user.uid;
  const myMember = members?.find((m) => m.uid === user.uid);
  const actorIsStaff = isStaffRole(myMember?.role ?? null, isCreator);
  const silencedUids = new Set((silences ?? []).map((s) => s.uid));
  const memberUids = new Set((members ?? []).map((m) => m.uid));
  const silencedLeavers = (silences ?? []).filter((s) => !memberUids.has(s.uid));

  if (loading || silencesLoading) {
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

  return (
    <UI.VStack align="stretch" spacing={4}>
      <UI.VStack align="stretch" spacing={1}>
        {members?.map((member) => {
          const name =
            member.uid === user.uid
              ? user.displayName || 'You'
              : member.displayName || 'Member';
          const isSilenced = silencedUids.has(member.uid);
          return (
            <MemberRosterRow
              key={member.uid}
              group={group}
              user={user}
              uid={member.uid}
              name={name}
              photoURL={member.photoURL}
              phoneLast4={member.phoneLast4}
              joinedAt={member.joinedAt}
              role={member.role}
              isOwn={member.uid === user.uid}
              isSilenced={isSilenced}
              targetIsMember
              actorRole={myMember?.role ?? null}
            />
          );
        })}
      </UI.VStack>
      {actorIsStaff && silencedLeavers.length > 0 ? (
        <UI.VStack align="stretch" spacing={1}>
          <UI.Text
            fontSize="xs"
            fontWeight="semibold"
            color="text.muted"
            textTransform="uppercase"
            letterSpacing="wide"
            px={1}
          >
            Silenced
          </UI.Text>
          {silencedLeavers.map((silence) => {
            const name = silence.displayName || 'Member';
            return (
              <MemberRosterRow
                key={`silence-${silence.uid}`}
                group={group}
                user={user}
                uid={silence.uid}
                name={name}
                photoURL={silence.photoURL}
                phoneLast4={null}
                joinedAt={null}
                role={null}
                isOwn={false}
                isSilenced
                targetIsMember={false}
                actorRole={myMember?.role ?? null}
              />
            );
          })}
        </UI.VStack>
      ) : null}
    </UI.VStack>
  );
};

const MemberRosterRow: React.FC<{
  group: Group;
  user: AppUser;
  uid: string;
  name: string;
  photoURL: string | null;
  phoneLast4: string | null;
  joinedAt: number | null;
  role: GroupMemberRole | null;
  isOwn: boolean;
  isSilenced: boolean;
  targetIsMember: boolean;
  actorRole: GroupMemberRole | null;
}> = ({
  group,
  user,
  uid,
  name,
  photoURL,
  phoneLast4,
  joinedAt,
  role,
  isOwn,
  isSilenced,
  targetIsMember,
  actorRole,
}) => {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileLabel = `View ${name}'s profile`;
  const perms = canManageMember({
    actorUid: user.uid,
    actorRole,
    actorIsCreator: group.uid === user.uid,
    targetUid: uid,
    targetRole: role,
    isCreatorTarget: uid === group.uid,
    targetIsMember,
  });

  return (
    <UI.HStack py={1.5} spacing={3} minW={0}>
      <UI.MorphingPopover
        open={profileOpen}
        onOpenChange={setProfileOpen}
        anchor="top left"
        flexShrink={0}
      >
        <UI.MorphingPopoverTrigger
          aria-label={profileLabel}
          borderRadius="full"
        >
          <UserAvatar
            name={name}
            seed={uid}
            photoURL={photoURL}
            size="sm"
            cursor="pointer"
          />
        </UI.MorphingPopoverTrigger>
        <UI.MorphingPopoverContent aria-label={profileLabel}>
          <MemberProfileBody
            groupId={group.id}
            name={name}
            uid={uid}
            photoURL={photoURL}
            phoneLast4={phoneLast4}
            joinedAt={joinedAt}
            role={role}
            isOwn={isOwn}
            isSilenced={isSilenced}
            targetIsMember={targetIsMember}
            canSilence={perms.canSilence}
            canToggleMod={perms.canToggleMod}
          />
        </UI.MorphingPopoverContent>
      </UI.MorphingPopover>
      <UI.Button
        variant="link"
        color="inherit"
        fontSize="sm"
        fontWeight="medium"
        h="auto"
        minW={0}
        maxW="100%"
        p={0}
        textDecoration="none"
        _hover={{ textDecoration: 'underline' }}
        onClick={() => setProfileOpen(true)}
        aria-label={profileLabel}
      >
        <UI.Text as="span" noOfLines={1}>
          {name}
          {isOwn ? ' (you)' : ''}
        </UI.Text>
      </UI.Button>
      <UI.HStack spacing={1} flexShrink={0} ml="auto">
        {role === 'creator' ? (
          <UI.Badge colorScheme="gray" fontSize="2xs">
            creator
          </UI.Badge>
        ) : null}
        {role === 'mod' ? (
          <UI.Badge colorScheme="purple" fontSize="2xs">
            mod
          </UI.Badge>
        ) : null}
        {isSilenced ? (
          <UI.Badge colorScheme="orange" fontSize="2xs">
            silenced
          </UI.Badge>
        ) : null}
      </UI.HStack>
    </UI.HStack>
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

  React.useEffect(() => {
    if (isOpen) setName(group.name);
  }, [isOpen, group.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name || saving) return;
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

  const canSubmit = !!name.trim() && name.trim() !== group.name && !saving;

  return (
    <UI.QuickModal
      isOpen={isOpen}
      onClose={onClose}
      headerContent="Rename room"
      size="sm"
    >
      <UI.ModalBody pb={6}>
        <UI.Box as="form" onSubmit={handleSubmit}>
          <UI.FormControl>
            <UI.FormLabel>New room name</UI.FormLabel>
            <UI.InputGroup>
              <UI.Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                autoComplete="off"
                pe={12}
              />
              <UI.InputRightElement h="100%" width="2.75rem">
                <UI.IconButton
                  type="submit"
                  aria-label="Save"
                  icon={faCheck}
                  size="sm"
                  colorScheme="action"
                  isDisabled={!canSubmit}
                  isLoading={saving}
                />
              </UI.InputRightElement>
            </UI.InputGroup>
          </UI.FormControl>
        </UI.Box>
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
            <NotifyLevelControl value={notifyLevel} onChange={setNotifyLevel} />
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
  const [pushEnabled, pushLoading, , syncPushLocal] = usePushEnabled(user.uid);

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

  const roomDisabled = pushLoading || !pushEnabled;

  return (
    <UI.QuickModal
      isOpen={isOpen}
      onClose={onClose}
      headerContent="Room notifications"
    >
      <UI.ModalBody pb={6}>
        <UI.VStack align="stretch" spacing={4}>
          {pushLoading ? (
            <UI.Skeleton h={12} borderRadius="md" />
          ) : (
            <NotificationsSwitch
              isChecked={pushEnabled}
              onCheckedChange={syncPushLocal}
              persist
            />
          )}
          <NotifyLevelControl
            value={value}
            onChange={setValue}
            isDisabled={roomDisabled}
          />
          <UI.Button
            preset="primary"
            alignSelf="center"
            minW="8rem"
            px={8}
            onClick={() => void save()}
            isLoading={saving}
            isDisabled={roomDisabled || value === level}
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
  role: GroupMemberRole | null;
};

const GroupChat: React.FC<{
  groupId: string;
  group: Group;
  user: AppUser;
}> = ({ groupId, group, user }) => {
  const [messages, loading, error] = useGroupMessages(groupId, { limit: 100 });
  const [members] = useGroupMembers(groupId, { channelId: 'chat' });
  const [silences] = useGroupSilences(groupId, { channelId: 'chat-silences' });
  const [pendingMessages, setPendingMessages] = React.useState<ChatItem[]>([]);

  const silencedUids = React.useMemo(
    () => new Set((silences ?? []).map((s) => s.uid)),
    [silences]
  );
  const iAmSilenced = silencedUids.has(user.uid);
  const myMember = members?.find((m) => m.uid === user.uid);
  const isCreator = group.uid === user.uid;
  const otherMemberCount = (members ?? []).filter(
    (m) => m.uid !== user.uid
  ).length;
  // Tip well until someone else joins (creator-only; mod promote copy is aspirational).
  const showCreatorTips = isCreator && otherMemberCount === 0;
  const shareModal = UI.useDisclosure();

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
        groupId={groupId}
        groupCreatorId={group.uid}
        currentUid={user.uid}
        actorRole={myMember?.role ?? null}
        silencedUids={silencedUids}
        memberByUid={memberByUid}
        showCreatorTips={showCreatorTips}
        onInvite={shareModal.onOpen}
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
          <Composer onSend={sendMessage} isSilenced={iAmSilenced} />
        </UI.Box>
      </UI.Box>
      <ShareGroupModal group={group} {...shareModal} />
    </React.Fragment>
  );
};

const CreatorTipsWell: React.FC<{ onInvite: () => void }> = ({ onInvite }) => (
  <UI.Box
    bg="surface.sunken"
    borderRadius="lg"
    px={4}
    py={4}
    data-testid="creator-tips-well"
  >
    <UI.VStack align="stretch" spacing={3}>
      <UI.Button
        preset="primary"
        size="sm"
        alignSelf="flex-start"
        onClick={onInvite}
      >
        Invite someone
      </UI.Button>
      <UI.Text fontSize="sm" color="text.muted">
        Once people join you can promote them to mods
      </UI.Text>
    </UI.VStack>
  </UI.Box>
);

const ChatScrollArea: React.FC<{
  items: ChatItem[];
  loading: boolean;
  error: Error | undefined;
  groupName: string;
  groupId: string;
  groupCreatorId: string;
  currentUid: string;
  actorRole: GroupMemberRole | null;
  silencedUids: Set<string>;
  memberByUid: Map<string, MemberProfile>;
  showCreatorTips: boolean;
  onInvite: () => void;
}> = ({
  items,
  loading,
  error,
  groupName,
  groupId,
  groupCreatorId,
  currentUid,
  actorRole,
  silencedUids,
  memberByUid,
  showCreatorTips,
  onInvite,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const didInitialScroll = React.useRef(false);
  const distanceFromBottomRef = React.useRef(0);
  const lastItem = items[items.length - 1];

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
      <UI.Box flex={1} overflowY="auto" px={4} pt={3} pb={10}>
        <UI.VStack align="stretch" spacing={4} maxW="760px" mx="auto">
          {showCreatorTips ? <CreatorTipsWell onInvite={onInvite} /> : null}
          <UI.EmptyState
            icon={faComments}
            title={`Say hi — this is the start of ${groupName}`}
            description="Messages show up here for everyone in the room."
            py={showCreatorTips ? 6 : 12}
          />
        </UI.VStack>
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
        {showCreatorTips ? (
          <UI.Box mb={4}>
            <CreatorTipsWell onInvite={onInvite} />
          </UI.Box>
        ) : null}
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
                groupId={groupId}
                groupCreatorId={groupCreatorId}
                currentUid={currentUid}
                actorRole={actorRole}
                isSilenced={silencedUids.has(message.uid)}
                targetIsMember={memberByUid.has(message.uid)}
                liveDisplayName={member?.displayName ?? message.authorName}
                livePhotoURL={member?.photoURL ?? message.authorPhotoURL}
                phoneLast4={member?.phoneLast4 ?? null}
                joinedAt={member?.joinedAt ?? null}
                role={member?.role ?? null}
              />
            </React.Fragment>
          );
        })}
      </UI.VStack>
    </UI.Box>
  );
};

const MessageDayDivider: React.FC<{ time: number }> = ({ time }) => (
  <UI.Flex align="center" gap={3} py={3} px={3} role="separator">
    <UI.Box flex={1} h="1px" bg="border.subtle" />
    <UI.Text
      fontSize="xs"
      color="text.muted"
      flexShrink={0}
      fontWeight="medium"
    >
      {formatMessageDayLabel(time)}
    </UI.Text>
    <UI.Box flex={1} h="1px" bg="border.subtle" />
  </UI.Flex>
);

export const MessageRow: React.FC<{
  message: ChatItem;
  grouped: boolean;
  isOwn: boolean;
  groupId?: string;
  groupCreatorId?: string;
  currentUid?: string;
  actorRole?: GroupMemberRole | null;
  isSilenced?: boolean;
  targetIsMember?: boolean;
  liveDisplayName?: string | null;
  livePhotoURL?: string | null;
  phoneLast4?: string | null;
  joinedAt?: number | null;
  role?: GroupMemberRole | null;
}> = ({
  message,
  grouped,
  isOwn,
  groupId,
  groupCreatorId,
  currentUid,
  actorRole = null,
  isSilenced = false,
  targetIsMember = true,
  liveDisplayName,
  livePhotoURL,
  phoneLast4,
  joinedAt,
  role,
}) => {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const displayName = liveDisplayName ?? message.authorName;
  const photoURL = livePhotoURL ?? message.authorPhotoURL;
  const name = formatAuthorLabel(displayName);
  const profileLabel = `View ${name}'s profile`;

  const perms =
    groupId && groupCreatorId && currentUid
      ? canManageMember({
          actorUid: currentUid,
          actorRole,
          actorIsCreator: currentUid === groupCreatorId,
          targetUid: message.uid,
          targetRole: role ?? null,
          isCreatorTarget: message.uid === groupCreatorId,
          targetIsMember,
        })
      : { canSilence: false, canToggleMod: false, canSelfUnmod: false };

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
        <UI.MorphingPopover
          open={profileOpen}
          onOpenChange={setProfileOpen}
          anchor="top left"
          flexShrink={0}
          mt={1}
        >
          <UI.MorphingPopoverTrigger
            aria-label={profileLabel}
            borderRadius="full"
          >
            <UserAvatar
              name={name}
              seed={message.uid}
              photoURL={photoURL}
              size="sm"
              cursor="pointer"
            />
          </UI.MorphingPopoverTrigger>
          <UI.MorphingPopoverContent aria-label={profileLabel}>
            <MemberProfileBody
              groupId={groupId}
              name={name}
              uid={message.uid}
              photoURL={photoURL ?? null}
              phoneLast4={phoneLast4 ?? null}
              joinedAt={joinedAt ?? null}
              role={role ?? null}
              isOwn={isOwn}
              isSilenced={isSilenced}
              targetIsMember={targetIsMember}
              canSilence={perms.canSilence}
              canToggleMod={perms.canToggleMod}
            />
          </UI.MorphingPopoverContent>
        </UI.MorphingPopover>
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
              onClick={() => setProfileOpen(true)}
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

const MemberProfileBody: React.FC<{
  groupId?: string;
  name: string;
  uid: string;
  photoURL: string | null;
  phoneLast4: string | null;
  joinedAt: number | null;
  role: GroupMemberRole | null;
  isOwn: boolean;
  isSilenced: boolean;
  targetIsMember: boolean;
  canSilence: boolean;
  canToggleMod: boolean;
}> = ({
  groupId,
  name,
  uid,
  photoURL,
  phoneLast4,
  joinedAt,
  role,
  isOwn,
  isSilenced,
  canSilence,
  canToggleMod,
}) => {
  const toast = UI.useToast();
  const [silenceBusy, setSilenceBusy] = React.useState(false);
  const [modBusy, setModBusy] = React.useState(false);
  const [silenceChecked, setSilenceChecked] = React.useState(isSilenced);
  const [modChecked, setModChecked] = React.useState(role === 'mod');

  React.useEffect(() => {
    setSilenceChecked(isSilenced);
  }, [isSilenced]);

  React.useEffect(() => {
    setModChecked(role === 'mod');
  }, [role]);

  const onSilenceChange = async (next: boolean) => {
    if (!groupId || silenceBusy) return;
    const prev = silenceChecked;
    setSilenceChecked(next);
    setSilenceBusy(true);
    try {
      await setMemberSilenced(groupId, uid, next, {
        displayName: name === 'You' ? null : name,
        photoURL,
      });
    } catch {
      setSilenceChecked(prev);
      toast({
        title: next ? "Couldn't silence member" : "Couldn't remove silence",
        status: 'error',
      });
    } finally {
      setSilenceBusy(false);
    }
  };

  const onModChange = async (next: boolean) => {
    if (!groupId || modBusy) return;
    const prev = modChecked;
    setModChecked(next);
    setModBusy(true);
    try {
      await setMemberMod(groupId, uid, next);
    } catch {
      setModChecked(prev);
      toast({
        title: next ? "Couldn't make mod" : "Couldn't remove mod",
        status: 'error',
      });
    } finally {
      setModBusy(false);
    }
  };

  const showControls = canSilence || canToggleMod;

  return (
    <UI.Box>
      <UI.VStack spacing={2} align="center" textAlign="center" px={4} py={4}>
        <UserAvatar name={name} seed={uid} photoURL={photoURL} size="lg" />
        <UI.Heading size="md" noOfLines={2}>
          {name}
          {isOwn ? ' (you)' : ''}
        </UI.Heading>
        {phoneLast4 ? (
          <UI.Text fontSize="xs" color="text.muted" letterSpacing="wide">
            ···{phoneLast4}
          </UI.Text>
        ) : null}
        {role === 'creator' ? (
          <UI.Text fontSize="sm" color="text.muted">
            Room creator
          </UI.Text>
        ) : null}
        {joinedAt ? (
          <UI.Text fontSize="sm" color="text.muted">
            Joined {formatJoinedAt(joinedAt)}
          </UI.Text>
        ) : null}
      </UI.VStack>
      {showControls ? (
        <UI.VStack
          align="stretch"
          spacing={3}
          px={4}
          py={3}
          borderTopWidth="1px"
          borderColor="border.subtle"
        >
          {canSilence ? (
            <UI.FormControl
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <UI.FormLabel mb={0} cursor="pointer">
                <UI.Badge colorScheme="orange" fontSize="xs">
                  Silenced
                </UI.Badge>
              </UI.FormLabel>
              <UI.Switch
                colorScheme="teal"
                size="md"
                isChecked={silenceChecked}
                isDisabled={silenceBusy || !groupId}
                onChange={(e) => void onSilenceChange(e.target.checked)}
                aria-label={`Silence ${name}`}
                data-testid="member-silence-switch"
              />
            </UI.FormControl>
          ) : null}
          {canToggleMod ? (
            <UI.FormControl
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <UI.FormLabel mb={0} cursor="pointer">
                <UI.Badge colorScheme="purple" fontSize="xs">
                  Mod
                </UI.Badge>
              </UI.FormLabel>
              <UI.Switch
                colorScheme="teal"
                size="md"
                isChecked={modChecked}
                isDisabled={modBusy || !groupId}
                onChange={(e) => void onModChange(e.target.checked)}
                aria-label={`Mod ${name}`}
                data-testid="member-mod-switch"
              />
            </UI.FormControl>
          ) : null}
        </UI.VStack>
      ) : null}
    </UI.Box>
  );
};

const MESSAGE_MAX_LENGTH = 140;

const Composer: React.FC<{
  onSend: (text: string) => Promise<void>;
  isSilenced?: boolean;
}> = ({ onSend, isSilenced = false }) => {
  const [text, setText] = React.useState('');
  const toast = UI.useToast();
  const canSend =
    !isSilenced && !!text.trim() && text.length <= MESSAGE_MAX_LENGTH;

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

  if (isSilenced) {
    return (
      <UI.Box
        px={3}
        py={3}
        borderRadius="md"
        bg="surface.sunken"
        borderWidth="1px"
        borderColor="border.subtle"
        data-testid="composer-silenced"
      >
        <UI.Text fontSize="sm" color="text.muted" textAlign="center">
          You’re silenced in this room.
        </UI.Text>
      </UI.Box>
    );
  }

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

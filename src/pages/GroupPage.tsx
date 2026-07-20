import { useChirpOnNewMessages } from '@@lib/notifications/chirp';
import { getShareUrl } from '@@lib/share';
import {
  Group,
  Message,
  addMessage,
  ensureGroupMember,
  isGroupMember,
  updateGroup,
  useGroup,
  useGroupMessages,
} from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { SignInPlacementFromAuth } from '@@components/auth/SignInPlacementFromAuth';
import { Header } from '@@components/Header';
import { UserAvatar } from '@@components/UserAvatar';
import { resolveAppUserPhotoURL, useAuthState } from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import {
  faArrowLeft,
  faCamera,
  faCheck,
  faCopy,
  faGear,
  faHeart,
  faPaperPlane,
  faPencil,
  faQrcode,
  faShareNodes,
} from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import QRCode from 'react-qr-code';
import { useParams } from 'react-router-dom';

const GroupPage: React.FC = () => {
  const { groupId } = useParams() as { groupId: string };

  return (
    <SignInPlacementFromAuth>
      <Header />
      <RequireAuth>
        <GroupPageContents groupId={groupId} />
      </RequireAuth>
    </SignInPlacementFromAuth>
  );
};
export default GroupPage;

const GroupPageContents: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { groupLoading } = useGroupState(groupId, { channelId: 'page-contents' });

  if (groupLoading) {
    return (
      <UI.Box maxW="480px" mx="auto" p={4}>
        <UI.Spinner />
      </UI.Box>
    );
  }

  return (
    <React.Fragment>
      <GroupHeader groupId={groupId} />
      <UI.Box maxW="480px" mx="auto" p={4}>
        <UI.VStack align="stretch" spacing={6}>
          <AddMessageForm groupId={groupId} />
          <MessageList groupId={groupId} />
        </UI.VStack>
      </UI.Box>
    </React.Fragment>
  );
};

const GroupHeader: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { group, groupLoading, error } = useGroupState(groupId, {
    channelId: 'header',
  });

  if (groupLoading) return <UI.Spinner />;
  if (error) return null;

  return (
    <UI.Box>
      <UI.HStack px={4} py={2}>
        <UI.Heading size="sm">
          <UI.RouteLink route={routes.home()} mr={2} aria-label="Back to home">
            <UI.Icon icon={faArrowLeft} />
          </UI.RouteLink>
          <UI.Text as="span" data-testid="group-title">
            {group?.name || '...'}
          </UI.Text>
        </UI.Heading>
        <GroupSharer group={group} ml="auto" />
        <GroupManager groupId={groupId} />
      </UI.HStack>
      <UI.Divider />
    </UI.Box>
  );
};

const GroupSharer: React.FC<UI.ButtonProps & { group?: Group }> = ({
  group,
  ...props
}) => {
  const modal = UI.useDisclosure();
  const toast = UI.useToast();
  const shareUrl = group ? getShareUrl(group.slug) : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copied', status: 'success', duration: 2000 });
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: group?.name ?? 'Hork group',
        url: shareUrl,
      });
    } else {
      copyLink();
    }
  };

  if (!group) return null;

  return (
    <React.Fragment>
      <UI.Button
        iconAfter={faQrcode}
        size="xs"
        {...props}
        onClick={modal.onOpen}
      >
        Share
      </UI.Button>

      <UI.QuickModal
        headerContent={
          <React.Fragment>
            <UI.Icon icon={faCamera} mr={2} />
            Join {group.name}
          </React.Fragment>
        }
        size="md"
        {...modal}
      >
        <UI.ModalBody px={6} pb={6}>
          <UI.VStack spacing={4}>
            <UI.Box
              bg="white"
              p={8}
              borderRadius="3xl"
              border="1px solid"
              borderColor="gray.200"
              shadow="lg"
            >
              <QRCode value={shareUrl} size={240} />
            </UI.Box>
            <UI.Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
              {shareUrl}
            </UI.Text>
            <UI.ButtonGroup size="sm">
              <UI.Button leftIcon={<UI.Icon icon={faCopy} />} onClick={copyLink}>
                Copy link
              </UI.Button>
              <UI.Button
                leftIcon={<UI.Icon icon={faShareNodes} />}
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

const GroupManager: React.FC<UI.ButtonProps & { groupId: string }> = ({
  groupId,
  ...props
}) => {
  const { group, groupLoading, error, canManageGroup } = useGroupState(
    groupId,
    { channelId: 'manager' }
  );
  const modal = UI.useDisclosure();

  if (groupLoading) return <UI.Spinner />;
  if (error) return null;
  if (!group) return null;
  if (!canManageGroup) return null;

  return (
    <React.Fragment>
      <UI.Button iconAfter={faGear} size="xs" {...props} onClick={modal.onOpen}>
        Manage
      </UI.Button>

      <UI.QuickModal headerContent="Manage Group" {...modal}>
        <UI.Divider />
        <UI.Tabs
          minH="320px"
          variant="soft-rounded"
          size="sm"
          colorScheme="green"
        >
          <UI.TabList p={2} bg="green.50">
            <UI.Tab justifyContent="start">General</UI.Tab>
            <UI.Tab justifyContent="start">Permissions</UI.Tab>
          </UI.TabList>

          <UI.TabPanels>
            <UI.TabPanel>
              <GroupForm groupId={groupId} defaultValues={group} />
            </UI.TabPanel>
            <UI.TabPanel px={5} py={3}>
              {/* Permissions UI deferred */}
            </UI.TabPanel>
          </UI.TabPanels>
        </UI.Tabs>
        <UI.Divider />
        <UI.ModalFooter py={2} justifyContent="center" fontSize="xs">
          Thank you for trying my app!
          <UI.Icon color="pink.400" icon={faHeart} mx={1} /> Linc
        </UI.ModalFooter>
      </UI.QuickModal>
    </React.Fragment>
  );
};

const GroupForm: React.FC<{ groupId: string; defaultValues: Group }> = ({
  groupId,
  defaultValues,
}) => {
  const isLight = UI.useColorModeValue(true, false);
  const [name, setName] = React.useState(defaultValues.name);
  const nameChanged = name !== defaultValues.name;

  const updateName = () => {
    if (nameChanged) {
      updateGroup(groupId, { name });
    }
  };

  return (
    <UI.FormControl>
      <UI.FormLabel>Group Name</UI.FormLabel>
      <UI.InputGroup>
        <UI.BaseInput
          name="group_name"
          value={name}
          onChange={setName}
          input={{
            bg: nameChanged
              ? isLight
                ? 'yellow.100'
                : 'yellow.900'
              : undefined,
            onBlur: updateName,
          }}
        />
        <UI.InputRightElement>
          {nameChanged ? (
            <UI.Icon icon={faPencil} color="yellow.500" />
          ) : (
            <UI.Icon icon={faCheck} color="green.500" />
          )}
        </UI.InputRightElement>
      </UI.InputGroup>
    </UI.FormControl>
  );
};

const AddMessageForm: React.FC<{ groupId: string }> = ({ groupId }) => {
  const {
    user,
    group,
    groupLoading,
    membershipLoading,
    error,
    canAddGroupMessage,
    addGroupMessage,
  } = useGroupState(groupId, { channelId: 'add-message' });
  const [text, setText] = React.useState('');

  if (groupLoading || membershipLoading) return <UI.Spinner />;
  if (error) return null;
  if (!user || !group) return null;

  if (!canAddGroupMessage) {
    return (
      <UI.Text fontSize="sm" color="gray.500">
        Sign in and join this group to post.
      </UI.Text>
    );
  }

  const canSend = !!text.trim();

  const handleSendClick = async () => {
    if (canSend) {
      await addGroupMessage(text);
      setText('');
    }
  };

  return (
    <UI.Box position="relative" mb={2}>
      <UI.RichTextEditor value={text} onChange={setText} />
      <UI.Box position="absolute" bottom={2} right={2}>
        <UI.Button
          colorScheme="green"
          size="sm"
          onClick={handleSendClick}
          iconAfter={faPaperPlane}
          isDisabled={!canSend}
        >
          Send
        </UI.Button>
      </UI.Box>
    </UI.Box>
  );
};

const useGroupState = (
  groupId: string,
  options?: { channelId?: string }
) => {
  const [user, userLoading, userError] = useAuthState();
  const [group, groupLoading, groupError] = useGroup(groupId, {
    channelId: options?.channelId,
  });
  const [member, setMember] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!user || !groupId) {
      setMember(null);
      return;
    }

    let cancelled = false;

    ensureGroupMember(groupId, user.uid)
      .catch(() => undefined)
      .then(() => isGroupMember(groupId, user.uid))
      .then((isMember) => {
        if (!cancelled) setMember(isMember);
      });

    return () => {
      cancelled = true;
    };
  }, [user, groupId]);

  const membershipLoading = !!user && member === null;
  const error = userError || groupError;

  const isCreator = group?.uid === user?.uid;
  const canAddGroupMessage = !!user && member === true;
  const canManageGroup = isCreator;

  const addGroupMessage = async (text: string) => {
    if (!user) return;

    await addMessage({
      uid: user.uid,
      authorName: user.displayName,
      authorPhotoURL: resolveAppUserPhotoURL(user),
      text,
      groupId,
    });
  };

  return {
    user,
    group,
    groupLoading: userLoading || groupLoading,
    membershipLoading,
    error,
    canAddGroupMessage,
    addGroupMessage,
    canManageGroup,
  };
};

const MessageList: React.FC<{ groupId: string }> = ({ groupId }) => {
  const [messages, loading, error] = useGroupMessages(groupId, { limit: 100 });

  useChirpOnNewMessages(messages, groupId);

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!messages?.length) return null;

  return (
    <UI.VStack align="stretch">
      {messages.map((message) => (
        <MessageCard key={message.id} message={message} />
      ))}
    </UI.VStack>
  );
};

export const MessageCard: React.FC<{ message: Message }> = ({ message }) => {
  const isLight = UI.useColorModeValue(true, false);

  return (
    <UI.VStack
      bg={isLight ? 'gray.50' : 'gray.700'}
      px={4}
      pt={3}
      pb={5}
      borderRadius="lg"
      spacing={4}
      align="stretch"
      position="relative"
    >
      <UI.HStack spacing={3}>
        <UserAvatar
          name={message.authorName || ''}
          seed={message.uid}
          photoURL={message.authorPhotoURL}
          size="sm"
        />
        <UI.VStack spacing={0} align="stretch" pt={0.5}>
          <UI.Heading size="sm">{message.authorName}</UI.Heading>
          <UI.Text fontSize="xs" opacity={0.6}>
            {formatDistanceToNow(message.time)} ago
          </UI.Text>
        </UI.VStack>
      </UI.HStack>
      <UI.Box>
        <UI.RichTextContent content={message.text} />
      </UI.Box>
    </UI.VStack>
  );
};

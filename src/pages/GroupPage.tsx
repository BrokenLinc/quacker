import {
  Group,
  Message,
  addMessage,
  updateGroup,
  useGroup,
  useGroupMessages,
} from '@@api';
import { Header } from '@@components/Header';
import { useAuthState } from '@@firebase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import {
  faArrowLeft,
  faCamera,
  faCheck,
  faGear,
  faHeart,
  faPaperPlane,
  faPencil,
  faQrcode,
} from '@fortawesome/free-solid-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import Markdown from 'react-markdown';
import QRCode from 'react-qr-code';
import { useParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';

const GroupPage: React.FC = () => {
  const { groupId } = useParams() as { groupId: string };

  return (
    <React.Fragment>
      <Header />
      <GroupPageContents groupId={groupId} />
    </React.Fragment>
  );
};
export default GroupPage;

const GroupPageContents: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { loading } = useGroupState(groupId);

  if (loading) {
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
  const { group, loading, error } = useGroupState(groupId);

  if (loading) return <UI.Spinner />;
  if (error) return null;

  return (
    <UI.Box>
      <UI.HStack px={4} py={2}>
        <UI.Heading size="sm">
          <UI.RouteLink route={routes.home()} mr={2}>
            <UI.Icon icon={faArrowLeft} />
          </UI.RouteLink>
          {group?.name || '...'}
        </UI.Heading>
        <GroupSharer ml="auto" />
        <GroupManager groupId={groupId} />
      </UI.HStack>
      <UI.Divider />
    </UI.Box>
  );
};

const GroupSharer: React.FC<UI.ButtonProps> = (props) => {
  const modal = UI.useDisclosure();

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
            Snap me!
          </React.Fragment>
        }
        size="md"
        {...modal}
      >
        <UI.ModalBody px={6} pb={6}>
          <UI.Box
            bg="white"
            p={16}
            borderRadius="3xl"
            border="1px solid"
            borderColor="gray.200"
            shadow="lg"
          >
            <QRCode value={window.location.href} size={270} />
          </UI.Box>
        </UI.ModalBody>
      </UI.QuickModal>
    </React.Fragment>
  );
};

const GroupManager: React.FC<UI.ButtonProps & { groupId: string }> = ({
  groupId,
  ...props
}) => {
  const { group, loading, error, canManageGroup } = useGroupState(groupId);
  const modal = UI.useDisclosure();

  if (loading) return <UI.Spinner />;
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
              {/* <GroupPermissions groupId={groupId} defaultValues={group} /> */}
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
  const isLight = UI.useColorModeValue(true, false);
  const { user, group, loading, error, canAddGroupMessage, addGroupMessage } =
    useGroupState(groupId);
  const [text, setText] = React.useState('');
  const [previewVisible, setPreviewVisible] = React.useState(false);
  const [helpVisible, setHelpVisible] = React.useState(false);

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!user || !group) return null;

  if (!canAddGroupMessage) {
    return null;
  }

  const canSend = !!text.trim();

  const handleSendClick = () => {
    if (canSend) {
      addGroupMessage(text);
      setText('');
    }
  };

  return (
    <UI.Box>
      <UI.Collapse in={previewVisible} animateOpacity>
        <UI.Box pb={2}>
          <MessageCard
            preview
            message={{
              uid: user.uid,
              authorName: user.displayName,
              authorPhotoURL: user.photoURL,
              time: new Date().getTime(),
              text,
              groupId,
            }}
          />
        </UI.Box>
      </UI.Collapse>
      <UI.Collapse in={helpVisible} animateOpacity>
        <UI.Box pb={2}>
          <UI.HStack
            bg={isLight ? 'purple.50' : 'purple.800'}
            border="2px solid"
            borderColor={isLight ? 'purple.100' : 'purple.700'}
            align="stretch"
            fontSize="xs"
            spacing={0}
            borderRadius="lg"
          >
            <UI.Text px={2} py={2} fontWeight="Bold">
              Formatting:
            </UI.Text>
            <UI.Text px={2} py={2}>
              [link label](url)
            </UI.Text>
            <UI.Text px={2} py={2}>
              **bold**
            </UI.Text>
            <UI.Text px={2} py={2}>
              *italic*
            </UI.Text>
            <UI.Text px={2} py={2}>
              # heading
            </UI.Text>
          </UI.HStack>
        </UI.Box>
      </UI.Collapse>
      <UI.InputGroup mb={2}>
        <UI.Textarea
          as={TextareaAutosize}
          placeholder="Say something!"
          resize="none"
          minH={10}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
        />
        <UI.InputRightElement top="auto" bottom={0} w="auto" pr={1}>
          <UI.Button
            colorScheme="green"
            size="sm"
            onClick={handleSendClick}
            iconAfter={faPaperPlane}
            isDisabled={!canSend}
          >
            Send
          </UI.Button>
        </UI.InputRightElement>
      </UI.InputGroup>
      <UI.HStack>
        <UI.ButtonGroup size="xs">
          {previewVisible ? (
            <UI.Button onClick={() => setPreviewVisible(false)}>
              Hide Preview
            </UI.Button>
          ) : (
            <UI.Button onClick={() => setPreviewVisible(true)}>
              Show Preview
            </UI.Button>
          )}
          {helpVisible ? (
            <UI.Button onClick={() => setHelpVisible(false)}>
              Hide Markdown Help
            </UI.Button>
          ) : (
            <UI.Button onClick={() => setHelpVisible(true)}>
              Show Markdown Help
            </UI.Button>
          )}
        </UI.ButtonGroup>
      </UI.HStack>
    </UI.Box>
  );
};

const useGroupState = (groupId: string) => {
  const [user, userLoading, userError] = useAuthState();
  const [group, groupLoading, groupError] = useGroup(groupId);

  const loading = userLoading || groupLoading;
  const error = userError || groupError;

  const isCreator = group?.uid === user?.uid;
  const canAddGroupMessage = isCreator;
  const canManageGroup = isCreator;

  const addGroupMessage = (text: string) => {
    if (!user) return;

    addMessage({
      uid: user.uid,
      authorName: user.displayName,
      authorPhotoURL: user.photoURL,
      time: Date.now(),
      text,
      groupId,
    });
  };

  return {
    user,
    group,
    loading,
    error,
    canAddGroupMessage,
    addGroupMessage,
    canManageGroup,
  };
};

const MessageList: React.FC<{ groupId: string }> = ({ groupId }) => {
  const [messages, loading, error] = useGroupMessages(groupId, { limit: 100 });

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!messages?.length) return null;

  return (
    <UI.VStack align="stretch">
      {messages?.map((message) => (
        <MessageCard key={message.id} message={message} />
      ))}
    </UI.VStack>
  );
};

export const MessageCard: React.FC<{ message: Message; preview?: boolean }> = ({
  message,
  preview,
}) => {
  const isLight = UI.useColorModeValue(true, false);

  return (
    <UI.VStack
      bg={
        preview
          ? isLight
            ? 'purple.50'
            : 'purple.800'
          : isLight
          ? 'gray.50'
          : 'gray.700'
      }
      border={preview ? '2px solid' : undefined}
      borderColor={isLight ? 'purple.100' : 'purple.700'}
      px={4}
      pt={3}
      pb={5}
      borderRadius="lg"
      spacing={4}
      align="stretch"
      position="relative"
    >
      {preview && (
        <UI.Badge
          colorScheme="purple"
          borderRadius="md"
          position="absolute"
          top={2}
          right={2}
          px={3}
        >
          Preview
        </UI.Badge>
      )}
      <UI.HStack spacing={3}>
        <UI.Avatar
          bg="purple.200"
          name={message.authorName || ''}
          src={message.authorPhotoURL || ''}
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
        <Markdown
          components={{
            h1: (props) => <UI.Heading size="md" {...props} />,
            h2: (props) => <UI.Heading size="sm" {...props} />,
            h3: (props) => <UI.Heading size="sm" {...props} />,
            h4: (props) => <UI.Heading size="sm" {...props} />,
            h5: (props) => <UI.Heading size="sm" {...props} />,
            h6: (props) => <UI.Heading size="sm" {...props} />,
            a: UI.Link,
          }}
        >
          {message.text.trim() || '🤔'}
        </Markdown>
      </UI.Box>
    </UI.VStack>
  );
};

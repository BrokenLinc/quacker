import * as UI from '@@ui';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { addGroup, useGroups } from '@@api';
import { UserAvatar } from '@@components/UserAvatar';
import {
  resolveAppUserPhotoURL,
  signOut,
  useAuthState,
  type AppUser,
} from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import { faMessage } from '@fortawesome/free-solid-svg-icons';

export const Header: React.FC = () => {
  const [user, loading, error] = useAuthState();

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!user) return null;

  return (
    <UI.Box>
      <UI.HStack px={4} py={2}>
        <UI.HStack
          mr="auto"
          alignItems="center"
          color="green.500"
          as={UI.RouteLink}
          route={routes.home()}
        >
          <UI.Icon icon={faMessage} />
          <UI.Text fontWeight="bold" fontSize="sm">
            quacker
          </UI.Text>
        </UI.HStack>
        <ColorModeToggle />
        <UserMenu user={user} />
      </UI.HStack>
      <UI.Divider />
    </UI.Box>
  );
};

const ColorModeToggle = () => {
  const { colorMode, toggleColorMode } = UI.useColorMode();
  return (
    <UI.Button onClick={toggleColorMode} size="sm" variant="ghost">
      {colorMode === 'light' ? 'Dark' : 'Light'}
    </UI.Button>
  );
};

const UserMenu: React.FC<{ user: AppUser }> = ({ user }) => {
  const addGroupModal = UI.useDisclosure();

  return (
    <React.Fragment>
      <UI.Menu>
        <UI.Box as="span" display="inline-flex" data-testid="user-menu-button">
          <UI.MenuButton
            as={UserAvatar}
            name={user.displayName || user.email || ''}
            email={user.email}
            photoURL={user.photoURL}
            cursor="pointer"
            size="sm"
          />
        </UI.Box>
        <UI.MenuList>
          <GroupMenuItemList />
          <UI.MenuItem
            fontSize="sm"
            fontWeight="bold"
            onClick={addGroupModal.onOpen}
          >
            New group
          </UI.MenuItem>
          <UI.MenuItem fontSize="sm" onClick={() => signOut()}>
            Log out {user.displayName?.split(' ')[0] ?? user.email}
          </UI.MenuItem>
        </UI.MenuList>
      </UI.Menu>
      <UI.QuickModal {...addGroupModal} headerContent="New group">
        <UI.ModalBody>
          <AddGroupForm user={user} onCreated={addGroupModal.onClose} />
        </UI.ModalBody>
      </UI.QuickModal>
    </React.Fragment>
  );
};

const GroupMenuItemList: React.FC = () => {
  const isLight = UI.useColorModeValue(true, false);
  const [groups, loading, error] = useGroups({
    limit: 100,
    channelId: 'header-menu',
  });

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!groups?.length) return null;

  return (
    <React.Fragment>
      {groups.map((group) => (
        <UI.RouteMenuItem
          key={group.id}
          route={routes.group(group.id)}
          fontSize="sm"
          activeProps={{
            bg: isLight ? 'green.100' : 'green.700',
          }}
        >
          {group.name}
        </UI.RouteMenuItem>
      ))}
      <UI.MenuDivider />
    </React.Fragment>
  );
};

const AddGroupForm: React.FC<{
  user: AppUser;
  onCreated: () => void;
}> = ({ user, onCreated }) => {
  const [name, setName] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { id } = await addGroup({
        uid: user.uid,
        authorName: user.displayName,
        authorPhotoURL: await resolveAppUserPhotoURL(user),
        name: name.trim(),
      });
      onCreated();
      navigate(routes.group(id).path);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UI.VStack align="stretch" spacing={3}>
      <UI.FormControl>
        <UI.FormLabel>Group name</UI.FormLabel>
        <UI.Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="WWDC hallway chat"
        />
      </UI.FormControl>
      <UI.Button
        colorScheme="green"
        onClick={handleSubmit}
        isDisabled={!name.trim() || submitting}
      >
        Create group
      </UI.Button>
    </UI.VStack>
  );
};

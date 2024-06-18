import * as UI from '@@ui';
import React from 'react';

import { addGroup, useGroups } from '@@api';
import { signOut, useAuthState, useSignIn } from '@@firebase/auth';
import { routes } from '@@routing/routes';
import { faMessage } from '@fortawesome/free-solid-svg-icons';

export const Header: React.FC = () => {
  const [user, loading, error] = useAuthState();

  if (loading) return <UI.Spinner />;
  if (error) return null;

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
        {user ? <UserMenu /> : <SignInButton />}
      </UI.HStack>
      <UI.Divider />
    </UI.Box>
  );
};

const SignInButton: React.FC = () => {
  const [signIn, , loading] = useSignIn();

  return (
    <UI.Button
      variant="outline"
      size="sm"
      onClick={() => {
        signIn();
      }}
      disabled={loading}
    >
      Sign In with Google
    </UI.Button>
  );
};

const ColorModeToggle = () => {
  const { colorMode, toggleColorMode } = UI.useColorMode();
  return (
    <UI.Button onClick={toggleColorMode}>
      Toggle {colorMode === 'light' ? 'Dark' : 'Light'}
    </UI.Button>
  );
};

const UserMenu: React.FC = () => {
  const [user, loading, error] = useAuthState();
  const addGroupModal = UI.useDisclosure();

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!user) return null;

  return (
    <React.Fragment>
      <UI.Menu>
        <UI.MenuButton
          as={UI.Avatar}
          name={user.displayName || ''}
          src={user.photoURL || undefined}
          cursor="pointer"
          size="sm"
        />
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
            Log out {user.displayName?.split(' ')[0]}
          </UI.MenuItem>
        </UI.MenuList>
      </UI.Menu>
      <UI.QuickModal {...addGroupModal}>
        <UI.ModalBody>
          <AddGroupForm />
        </UI.ModalBody>
      </UI.QuickModal>
    </React.Fragment>
  );
};

const GroupMenuItemList: React.FC = () => {
  const isLight = UI.useColorModeValue(true, false);
  const [groups, loading, error] = useGroups({ limit: 100 });

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!groups?.length) return null;

  return (
    <React.Fragment>
      {groups?.map((group) => (
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

const AddGroupForm: React.FC = () => {
  const [user, loading, error] = useAuthState();

  if (loading) return <UI.Spinner />;
  if (error) return null;
  if (!user) return null;

  const handleAddGroupClick = () => {
    addGroup({
      uid: user.uid,
      authorName: user.displayName,
      authorPhotoURL: user.photoURL,
      time: Date.now(),
      name: 'Test Group',
    });
    // TODO: redirect to new group page
  };

  return (
    <UI.Button colorScheme="green" onClick={handleAddGroupClick}>
      Add test group
    </UI.Button>
  );
};

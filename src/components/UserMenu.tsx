import * as UI from '@@ui';
import {
  faMoon,
  faPenToSquare,
  faPlus,
  faRightFromBracket,
  faSun,
} from '@fortawesome/free-solid-svg-icons';
import React from 'react';

import { useGroups } from '@@api';
import { UserAvatar } from '@@components/UserAvatar';
import { signOut, useAuthState } from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';

import { DisplayNameForm } from './DisplayNameForm';
import { NewGroupModal } from './NewGroupModal';

export type UserMenuProps = {
  /** Include group navigation + New group (mobile — no sidebar). */
  showGroups?: boolean;
  /** Include the appearance toggle (mobile — no sidebar footer). */
  showColorMode?: boolean;
};

export const UserMenu: React.FC<UserMenuProps> = ({
  showGroups,
  showColorMode,
}) => {
  const [user] = useAuthState();
  const { colorMode, toggleColorMode } = UI.useColorMode();
  const newGroupModal = UI.useDisclosure();
  const editNameModal = UI.useDisclosure();

  if (!user) return null;

  return (
    <React.Fragment>
      <UI.Menu>
        <UI.Box as="span" display="inline-flex" data-testid="user-menu-button">
          <UI.MenuButton
            as={UserAvatar}
            name={user.displayName || user.phone || user.email || ''}
            seed={user.uid}
            photoURL={user.photoURL}
            cursor="pointer"
            size="sm"
          />
        </UI.Box>
        <UI.MenuList>
          <UI.Box px={3} py={1.5}>
            <UI.Text fontSize="sm" fontWeight="bold" noOfLines={1}>
              {user.displayName || user.phone || user.email}
            </UI.Text>
          </UI.Box>
          <UI.MenuDivider />
          {showGroups ? (
            <GroupMenuItems onNewGroup={newGroupModal.onOpen} />
          ) : null}
          <UI.MenuItem
            fontSize="sm"
            icon={<UI.Icon icon={faPenToSquare} />}
            onClick={editNameModal.onOpen}
          >
            Change name
          </UI.MenuItem>
          {showColorMode ? (
            <UI.MenuItem
              fontSize="sm"
              icon={<UI.Icon icon={colorMode === 'light' ? faMoon : faSun} />}
              onClick={toggleColorMode}
            >
              {colorMode === 'light' ? 'Dark mode' : 'Light mode'}
            </UI.MenuItem>
          ) : null}
          <UI.MenuDivider />
          <UI.MenuItem
            fontSize="sm"
            icon={<UI.Icon icon={faRightFromBracket} />}
            onClick={() => signOut()}
          >
            Log out
          </UI.MenuItem>
        </UI.MenuList>
      </UI.Menu>

      <NewGroupModal
        isOpen={newGroupModal.isOpen}
        onClose={newGroupModal.onClose}
      />
      <UI.QuickModal
        isOpen={editNameModal.isOpen}
        onClose={editNameModal.onClose}
        headerContent="Change name"
      >
        <UI.ModalBody pb={6}>
          <DisplayNameForm onDone={editNameModal.onClose} />
        </UI.ModalBody>
      </UI.QuickModal>
    </React.Fragment>
  );
};

const GroupMenuItems: React.FC<{ onNewGroup: () => void }> = ({
  onNewGroup,
}) => {
  const [user] = useAuthState();
  const [groups] = useGroups({
    userId: user?.uid,
    channelId: 'user-menu',
  });

  return (
    <React.Fragment>
      {groups?.map((group) => (
        <UI.RouteMenuItem
          key={group.id}
          route={routes.group(group.id)}
          fontSize="sm"
          activeProps={{ bg: 'nav.selected' }}
        >
          {group.name}
        </UI.RouteMenuItem>
      ))}
      <UI.MenuItem
        fontSize="sm"
        fontWeight="bold"
        icon={<UI.Icon icon={faPlus} />}
        onClick={onNewGroup}
      >
        New group
      </UI.MenuItem>
      <UI.MenuDivider />
    </React.Fragment>
  );
};

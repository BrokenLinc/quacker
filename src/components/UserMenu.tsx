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
  const sheet = UI.useDisclosure();
  const isMobile = UI.useBreakpointValue(
    { base: true, md: false },
    { ssr: false }
  );

  const [groups] = useGroups({
    userId: showGroups ? user?.uid : undefined,
    channelId: 'user-menu',
  });

  if (!user) return null;

  const identityLabel = user.displayName || user.phone || user.email || '';

  const openEditName = () => editNameModal.onOpen();
  const openNewGroup = () => newGroupModal.onOpen();

  const sheetItems: UI.ActionSheetItem[] = [];
  // Account actions first (above a long group list) so Maestro + thumbs can
  // reach appearance / log out without scrolling past every membership.
  if (showColorMode) {
    sheetItems.push({
      id: 'color-mode',
      label: colorMode === 'light' ? 'Dark mode' : 'Light mode',
      icon: colorMode === 'light' ? faMoon : faSun,
      onClick: toggleColorMode,
    });
  }
  sheetItems.push({
    id: 'change-name',
    label: 'Change name',
    icon: faPenToSquare,
    onClick: openEditName,
  });
  sheetItems.push({
    id: 'log-out',
    label: 'Log out',
    icon: faRightFromBracket,
    onClick: () => void signOut(),
  });
  if (showGroups) {
    for (const group of groups ?? []) {
      sheetItems.push({
        id: `group-${group.id}`,
        label: group.name,
        route: routes.group(group.id),
      });
    }
    sheetItems.push({
      id: 'new-group',
      label: 'New group',
      icon: faPlus,
      onClick: openNewGroup,
    });
  }
  const avatar = (
    <UserAvatar
      name={identityLabel}
      seed={user.uid}
      photoURL={user.photoURL}
      cursor="pointer"
      size="sm"
      onClick={isMobile ? sheet.onOpen : undefined}
      data-testid="user-menu-button"
      aria-label="Account menu"
    />
  );

  const modals = (
    <React.Fragment>
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

  if (isMobile) {
    return (
      <React.Fragment>
        <UI.Box as="span" display="inline-flex">
          {avatar}
        </UI.Box>
        <UI.ActionSheet
          isOpen={sheet.isOpen}
          onClose={sheet.onClose}
          headerContent="Account"
          items={sheetItems}
        >
          <UI.Box px={4} pb={2}>
            <UI.Text fontSize="sm" fontWeight="bold" noOfLines={1}>
              {identityLabel}
            </UI.Text>
          </UI.Box>
        </UI.ActionSheet>
        {modals}
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <UI.Menu>
        <UI.Box as="span" display="inline-flex" data-testid="user-menu-button">
          <UI.MenuButton
            as={UserAvatar}
            name={identityLabel}
            seed={user.uid}
            photoURL={user.photoURL}
            cursor="pointer"
            size="sm"
            aria-label="Account menu"
          />
        </UI.Box>
        <UI.MenuList>
          <UI.Box px={3} py={1.5}>
            <UI.Text fontSize="sm" fontWeight="bold" noOfLines={1}>
              {identityLabel}
            </UI.Text>
          </UI.Box>
          <UI.MenuDivider />
          {showGroups ? (
            <GroupMenuItems onNewGroup={openNewGroup} groups={groups} />
          ) : null}
          <UI.MenuItem
            fontSize="sm"
            icon={<UI.Icon icon={faPenToSquare} />}
            onClick={openEditName}
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
      {modals}
    </React.Fragment>
  );
};

const GroupMenuItems: React.FC<{
  onNewGroup: () => void;
  groups: ReturnType<typeof useGroups>[0];
}> = ({ onNewGroup, groups }) => {
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

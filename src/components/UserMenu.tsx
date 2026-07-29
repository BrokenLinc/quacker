import * as UI from '@@ui';
import {
  faBell,
  faMoon,
  faPenToSquare,
  faRightFromBracket,
  faSun,
} from '@fortawesome/free-solid-svg-icons';
import React from 'react';

import { UserAvatar } from '@@components/UserAvatar';
import { NotificationsSwitch } from '@@components/NotificationsSwitch';
import { usePushEnabled } from '@@lib/notifications/prefs';
import { removeCurrentPushSubscription } from '@@lib/notifications/subscribe';
import { signOut, useAuthState } from '@@lib/supabase/auth';

import { DisplayNameForm } from './DisplayNameForm';

export type UserMenuProps = {
  /** Include the appearance toggle (mobile — no sidebar footer). */
  showColorMode?: boolean;
};

export const UserMenu: React.FC<UserMenuProps> = ({ showColorMode }) => {
  const [user] = useAuthState();
  const { colorMode, toggleColorMode } = UI.useColorMode();
  const editNameModal = UI.useDisclosure();
  const notifyModal = UI.useDisclosure();
  const sheet = UI.useDisclosure();
  const isMobile = UI.useBreakpointValue(
    { base: true, md: false },
    { ssr: false }
  );
  const [pushEnabled] = usePushEnabled(user?.uid);

  if (!user) return null;

  const identityLabel = user.displayName || user.phone || user.email || '';

  const openEditName = () => editNameModal.onOpen();
  const openNotifications = () => notifyModal.onOpen();

  const handleSignOut = async () => {
    await removeCurrentPushSubscription(user.uid).catch(() => undefined);
    await signOut();
  };

  const sheetItems: UI.ActionSheetItem[] = [];
  if (showColorMode) {
    sheetItems.push({
      id: 'color-mode',
      label: colorMode === 'light' ? 'Dark mode' : 'Light mode',
      icon: colorMode === 'light' ? faMoon : faSun,
      onClick: toggleColorMode,
    });
  }
  sheetItems.push({
    id: 'notifications',
    label: pushEnabled ? 'Notifications (on)' : 'Notifications',
    icon: faBell,
    onClick: openNotifications,
  });
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
    onClick: () => void handleSignOut(),
  });

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
      <UI.QuickModal
        isOpen={editNameModal.isOpen}
        onClose={editNameModal.onClose}
        headerContent="Change name"
      >
        <UI.ModalBody pb={6}>
          <DisplayNameForm onDone={editNameModal.onClose} />
        </UI.ModalBody>
      </UI.QuickModal>
      <UI.QuickModal
        isOpen={notifyModal.isOpen}
        onClose={notifyModal.onClose}
        headerContent="Notifications"
      >
        <UI.ModalBody pb={6}>
          <NotificationsPrefsBody userId={user.uid} />
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
          <UI.MenuItem
            fontSize="sm"
            icon={<UI.Icon icon={faBell} />}
            onClick={openNotifications}
          >
            {pushEnabled ? 'Notifications (on)' : 'Notifications'}
          </UI.MenuItem>
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
            onClick={() => void handleSignOut()}
          >
            Log out
          </UI.MenuItem>
        </UI.MenuList>
      </UI.Menu>
      {modals}
    </React.Fragment>
  );
};

const NotificationsPrefsBody: React.FC<{ userId: string }> = ({ userId }) => {
  const [enabled, loading, , syncLocal] = usePushEnabled(userId);

  if (loading) {
    return <UI.Skeleton h={12} borderRadius="md" />;
  }

  return (
    <NotificationsSwitch
      isChecked={enabled}
      onCheckedChange={syncLocal}
      persist
    />
  );
};

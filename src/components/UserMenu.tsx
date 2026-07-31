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
  /** Include the appearance toggle (mobile header — no sidebar footer). */
  showColorMode?: boolean;
};

export const UserMenu: React.FC<UserMenuProps> = ({ showColorMode }) => {
  const [user] = useAuthState();
  const { colorMode, toggleColorMode } = UI.useColorMode();
  const editNameModal = UI.useDisclosure();
  const notifyModal = UI.useDisclosure();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [pushEnabled] = usePushEnabled(user?.uid);

  if (!user) return null;

  const identityLabel = user.displayName || user.phone || user.email || '';

  const closeMenu = () => setMenuOpen(false);

  const openEditName = () => {
    closeMenu();
    editNameModal.onOpen();
  };
  const openNotifications = () => {
    closeMenu();
    notifyModal.onOpen();
  };

  const handleSignOut = async () => {
    closeMenu();
    await removeCurrentPushSubscription(user.uid).catch(() => undefined);
    await signOut();
  };

  // Header/group chrome is top → open downward; sidebar footer → open upward.
  const placement = showColorMode ? 'bottom' : 'top';
  const align = showColorMode ? 'end' : 'start';

  return (
    <React.Fragment>
      <UI.MorphingPopover
        placement={placement}
        align={align}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      >
        <UI.MorphingPopoverTrigger
          data-testid="user-menu-button"
          aria-label="Account menu"
        >
          <UserAvatar
            name={identityLabel}
            seed={user.uid}
            photoURL={user.photoURL}
            cursor="pointer"
            size="sm"
          />
        </UI.MorphingPopoverTrigger>
        <UI.MorphingPopoverContent title="Account">
          <UI.Box px={4} pt={2} pb={1}>
            <UI.Text fontSize="sm" fontWeight="bold" noOfLines={1}>
              {identityLabel}
            </UI.Text>
          </UI.Box>
          <UI.VStack align="stretch" spacing={0} py={1}>
            {showColorMode ? (
              <AccountMenuRow
                icon={colorMode === 'light' ? faMoon : faSun}
                label={colorMode === 'light' ? 'Dark mode' : 'Light mode'}
                onClick={() => {
                  toggleColorMode();
                  closeMenu();
                }}
              />
            ) : null}
            <AccountMenuRow
              icon={faBell}
              label={pushEnabled ? 'Notifications (on)' : 'Notifications'}
              onClick={openNotifications}
            />
            <AccountMenuRow
              icon={faPenToSquare}
              label="Change name"
              onClick={openEditName}
            />
            <UI.Box
              borderTopWidth="1px"
              borderColor="border.subtle"
              my={1}
            />
            <AccountMenuRow
              icon={faRightFromBracket}
              label="Log out"
              onClick={() => void handleSignOut()}
            />
          </UI.VStack>
        </UI.MorphingPopoverContent>
      </UI.MorphingPopover>

      <UI.QuickModal
        isOpen={editNameModal.isOpen}
        onClose={editNameModal.onClose}
        headerContent="Change name"
        mobilePlacement={placement}
      >
        <UI.ModalBody pb={6}>
          <DisplayNameForm onDone={editNameModal.onClose} />
        </UI.ModalBody>
      </UI.QuickModal>
      <UI.QuickModal
        isOpen={notifyModal.isOpen}
        onClose={notifyModal.onClose}
        headerContent="Notifications"
        mobilePlacement={placement}
      >
        <UI.ModalBody pb={6}>
          <NotificationsPrefsBody userId={user.uid} />
        </UI.ModalBody>
      </UI.QuickModal>
    </React.Fragment>
  );
};

const AccountMenuRow: React.FC<{
  icon: typeof faBell;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <UI.Button
    variant="ghost"
    justifyContent="flex-start"
    borderRadius={0}
    h="auto"
    py={2.5}
    px={4}
    fontWeight="normal"
    fontSize="sm"
    leftIcon={<UI.Icon icon={icon} />}
    onClick={onClick}
  >
    {label}
  </UI.Button>
);

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

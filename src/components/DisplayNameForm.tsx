import * as UI from '@@ui';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

import { updateMyMemberProfile } from '@@api';
import { NotificationsSwitch } from '@@components/NotificationsSwitch';
import {
  phoneLast4FromPhone,
  resolveAppUserPhotoURL,
  updateDisplayName,
  useAuthState,
} from '@@lib/supabase/auth';
import { setPushEnabled } from '@@lib/notifications/prefs';
import type { EnablePushResult } from '@@lib/notifications/subscribe';
import { getNotificationPermissionState } from '@@lib/notifications/permission';

export type DisplayNameFormProps = {
  /** Called after saving (or skipping, when allowed). */
  onDone?: () => void;
  allowSkip?: boolean;
  /** Show notifications Switch (onboarding). Default false for rename-only. */
  showNotificationsOptIn?: boolean;
};

/** "What should people call you?" — real identity beats `···1234`. */
export const DisplayNameForm: React.FC<DisplayNameFormProps> = ({
  onDone,
  allowSkip,
  showNotificationsOptIn = false,
}) => {
  const [user] = useAuthState();
  const [name, setName] = React.useState('');
  const [notifyOptIn, setNotifyOptIn] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const toast = UI.useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await updateDisplayName(trimmed);
      if (user) {
        // Best-effort roster sync; the rename itself already succeeded.
        await updateMyMemberProfile(user.uid, {
          displayName: trimmed,
          photoURL: resolveAppUserPhotoURL(user),
          phoneLast4: phoneLast4FromPhone(user.phone),
        }).catch(() => undefined);

        if (showNotificationsOptIn) {
          if (notifyOptIn) {
            const result = await setPushEnabled(user.uid, true);
            if (!result.ok) {
              toastPushFailure(toast, result);
            }
          } else {
            await setPushEnabled(user.uid, false).catch(() => undefined);
          }
        }
      }
      onDone?.();
    } catch {
      toast({
        title: "Couldn't save your name",
        description: 'Check your connection and try again.',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = !!name.trim() && !saving;

  return (
    <UI.VStack as="form" onSubmit={handleSubmit} align="stretch" spacing={3}>
      <UI.FormControl>
        <UI.FormLabel>What should people call you?</UI.FormLabel>
        {showNotificationsOptIn ? (
          <UI.Input
            value={name}
            onChange={(e) =>
              setName(e.target.value.replace(/[^\p{L} ]/gu, '').slice(0, 25))
            }
            maxLength={25}
            placeholder="Fox"
            autoComplete="nickname"
            autoFocus
            data-testid="display-name-input"
          />
        ) : (
          <UI.InputGroup>
            <UI.Input
              value={name}
              onChange={(e) =>
                setName(e.target.value.replace(/[^\p{L} ]/gu, '').slice(0, 25))
              }
              maxLength={25}
              placeholder="Fox"
              autoComplete="nickname"
              autoFocus
              data-testid="display-name-input"
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
        )}
        <UI.FormHelperText>
          Shown with your messages in every room
        </UI.FormHelperText>
      </UI.FormControl>
      {showNotificationsOptIn ? (
        <NotificationsSwitch
          isChecked={notifyOptIn}
          onCheckedChange={setNotifyOptIn}
          persist={false}
        />
      ) : null}
      {showNotificationsOptIn ? (
        <UI.Button
          type="submit"
          preset="primary"
          isDisabled={!name.trim()}
          isLoading={saving}
          loadingText="Saving…"
        >
          Continue
        </UI.Button>
      ) : null}
      {allowSkip ? (
        <UI.Button variant="ghost" size="sm" onClick={() => onDone?.()}>
          Skip for now
        </UI.Button>
      ) : null}
    </UI.VStack>
  );
};

function toastPushFailure(
  toast: ReturnType<typeof UI.useToast>,
  result: Extract<EnablePushResult, { ok: false }>
) {
  const permission = getNotificationPermissionState();
  if (
    result.reason === 'ios-needs-install' ||
    permission === 'ios-needs-install'
  ) {
    toast({
      title: 'Install Yowl on your Home Screen',
      description:
        'On iPhone, Add to Home Screen first, then turn on notifications from Account.',
      status: 'info',
      duration: 6000,
    });
    return;
  }
  if (result.reason === 'denied') {
    toast({
      title: 'Notifications blocked',
      description:
        'Allow notifications for Yowl in your browser settings if you change your mind.',
      status: 'warning',
      duration: 5000,
    });
    return;
  }
  toast({
    title: "Couldn't enable notifications",
    description: 'You can turn them on later from Account.',
    status: 'warning',
    duration: 4000,
  });
}

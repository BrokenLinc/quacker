import * as UI from '@@ui';
import React from 'react';

import { getNotificationPermissionState } from '@@lib/notifications/permission';
import { setPushEnabled } from '@@lib/notifications/prefs';
import type { EnablePushResult } from '@@lib/notifications/subscribe';
import { useAuthState } from '@@lib/supabase/auth';

export type NotificationsSwitchProps = {
  /** Controlled checked state (optional — defaults to internal). */
  isChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** When true, persists prefs + may request OS permission on enable. */
  persist?: boolean;
  size?: UI.SwitchProps['size'];
};

const failCopy = (
  reason: Extract<EnablePushResult, { ok: false }>['reason']
): { title: string; description: string } => {
  switch (reason) {
    case 'ios-needs-install':
      return {
        title: 'Install Yowl on your Home Screen',
        description:
          'On iPhone, Add to Home Screen first, then turn on notifications from there.',
      };
    case 'denied':
      return {
        title: 'Notifications blocked',
        description:
          'Allow notifications for Yowl in your browser or system settings, then try again.',
      };
    case 'no-vapid':
    case 'unsupported':
      return {
        title: "Notifications aren't available here",
        description: 'Try Chrome, Edge, Firefox, or an installed Yowl app.',
      };
    default:
      return {
        title: "Couldn't enable notifications",
        description: 'Check your connection and try again.',
      };
  }
};

/**
 * In-app Switch that gates the OS permission prompt.
 * Turning on (with persist) is the only path that calls requestPermission.
 */
export const NotificationsSwitch: React.FC<NotificationsSwitchProps> = ({
  isChecked: controlled,
  onCheckedChange,
  persist = false,
  size = 'md',
}) => {
  const [user] = useAuthState();
  const toast = UI.useToast();
  const [local, setLocal] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const checked = controlled ?? local;

  const apply = async (next: boolean) => {
    if (busy) return;
    const permission = getNotificationPermissionState();

    if (next && (permission === 'unsupported' || permission === 'denied')) {
      const copy = failCopy(permission === 'denied' ? 'denied' : 'unsupported');
      toast({ ...copy, status: 'warning', duration: 5000 });
      return;
    }
    if (next && permission === 'ios-needs-install') {
      toast({ ...failCopy('ios-needs-install'), status: 'info', duration: 6000 });
      return;
    }

    if (!persist || !user) {
      setLocal(next);
      onCheckedChange?.(next);
      return;
    }

    setBusy(true);
    try {
      const result = await setPushEnabled(user.uid, next);
      if (!result.ok) {
        toast({ ...failCopy(result.reason), status: 'warning', duration: 5000 });
        return;
      }
      setLocal(next);
      onCheckedChange?.(next);
    } catch {
      toast({
        title: "Couldn't update notifications",
        description: 'Check your connection and try again.',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <UI.FormControl display="flex" alignItems="flex-start" gap={3}>
      <UI.Switch
        mt={1}
        size={size}
        colorScheme="teal"
        isChecked={checked}
        isDisabled={busy}
        onChange={(e) => void apply(e.target.checked)}
        data-testid="notifications-switch"
        aria-label="Notify me when someone yowls"
      />
      <UI.Box>
        <UI.FormLabel mb={0} fontWeight="medium" cursor="pointer">
          Notify me when someone yowls
        </UI.FormLabel>
        <UI.Text fontSize="sm" color="text.muted">
          You choose first — your device will ask for permission only if you turn
          this on.
        </UI.Text>
      </UI.Box>
    </UI.FormControl>
  );
};

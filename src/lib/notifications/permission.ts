import { isStandaloneDisplay } from '@@lib/pwa/standalone';

export type NotificationPermissionState =
  | 'unsupported'
  | 'ios-needs-install'
  | 'default'
  | 'granted'
  | 'denied';

const isIos = (): boolean =>
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

/** Browser / PWA readiness for Web Push — never requests permission. */
export const getNotificationPermissionState =
  (): NotificationPermissionState => {
    if (typeof window === 'undefined') return 'unsupported';
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return 'unsupported';
    }
    if (isIos() && !isStandaloneDisplay()) {
      return 'ios-needs-install';
    }
    if (!('PushManager' in window)) return 'unsupported';
    return Notification.permission as 'default' | 'granted' | 'denied';
  };

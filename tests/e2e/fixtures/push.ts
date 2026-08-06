import type { Page } from '@playwright/test';

/** Valid uncompressed P-256 point as url-safe base64 (65 zeroed bytes after 0x04). */
export const E2E_VAPID_PUBLIC_KEY =
  'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

declare global {
  interface Window {
    __QUACKER_E2E_VAPID__?: string;
    __quackerPushPermissionRequests?: number;
    __quackerPushSubscribed?: boolean;
  }
}

/**
 * Install before navigation / session seed.
 * Stubs Notification + PushManager so CI/headless never hits a real push service.
 */
export const installPushMocks = async (page: Page) => {
  await page.addInitScript(
    ({ vapid }: { vapid: string }) => {
      window.__QUACKER_E2E_VAPID__ = vapid;
      window.__quackerPushPermissionRequests = 0;
      window.__quackerPushSubscribed = false;

      // Satisfy feature detection in permission.ts
      const win = window as Window & {
        PushManager?: new () => unknown;
        Notification: typeof Notification;
      };
      win.PushManager = win.PushManager || function PushManager() {};

      let permission: NotificationPermission = 'default';

      const FakeNotification = function FakeNotification() {
        // type presence only
      } as unknown as typeof Notification;

      Object.defineProperty(FakeNotification, 'permission', {
        get: () => permission,
        configurable: true,
      });
      FakeNotification.requestPermission = async () => {
        window.__quackerPushPermissionRequests =
          (window.__quackerPushPermissionRequests ?? 0) + 1;
        permission = 'granted';
        return permission;
      };
      win.Notification = FakeNotification;

      const endpoint = `https://push.example.test/e2e/${Math.random().toString(36).slice(2)}`;

      // Decode VAPID so subscription.options.applicationServerKey matches the
      // app's enablePushSubscription reuse check.
      const padding = '='.repeat((4 - (vapid.length % 4)) % 4);
      const b64 = (vapid + padding).replace(/-/g, '+').replace(/_/g, '/');
      const raw = atob(b64);
      const vapidBuffer = new ArrayBuffer(raw.length);
      const vapidBytes = new Uint8Array(vapidBuffer);
      for (let i = 0; i < raw.length; i++) vapidBytes[i] = raw.charCodeAt(i);

      const fakeWorker = {
        state: 'activated',
        postMessage: () => undefined,
      };

      const fakeSubscription = {
        endpoint,
        expirationTime: null,
        options: {
          userVisibleOnly: true,
          applicationServerKey: vapidBuffer,
        },
        getKey: (name: string) => {
          if (name === 'p256dh') return new Uint8Array(65).buffer;
          if (name === 'auth') return new Uint8Array(16).buffer;
          return null;
        },
        toJSON: () => ({
          endpoint,
          keys: {
            p256dh:
              'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            auth: 'dGVzdGF1dGhrZXkxMjM0NTY',
          },
        }),
        unsubscribe: async () => true,
      };

      const registration = {
        active: fakeWorker,
        waiting: null,
        pushManager: {
          subscribe: async () => {
            window.__quackerPushSubscribed = true;
            return fakeSubscription;
          },
          getSubscription: async () =>
            window.__quackerPushSubscribed ? fakeSubscription : null,
        },
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          register: async () => registration,
          getRegistration: async () => registration,
          ready: Promise.resolve(registration),
          // enablePushSubscription awaits a controlling worker before subscribe.
          controller: fakeWorker,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        },
      });
    },
    { vapid: E2E_VAPID_PUBLIC_KEY }
  );
};

export const getPushPermissionRequestCount = async (page: Page) =>
  page.evaluate(() => window.__quackerPushPermissionRequests ?? 0);

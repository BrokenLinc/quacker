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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).PushManager =
        (window as any).PushManager || function PushManager() {};

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Notification = FakeNotification;

      const endpoint = `https://push.example.test/e2e/${Math.random().toString(36).slice(2)}`;
      const fakeSubscription = {
        endpoint,
        expirationTime: null,
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
        },
      });
    },
    { vapid: E2E_VAPID_PUBLIC_KEY }
  );
};

export const getPushPermissionRequestCount = async (page: Page) =>
  page.evaluate(() => window.__quackerPushPermissionRequests ?? 0);

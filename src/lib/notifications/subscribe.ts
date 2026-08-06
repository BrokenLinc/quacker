/**
 * Web Push subscription — only call after an explicit in-app Switch enable
 * (user gesture). Never request OS permission automatically.
 */

import { ensureRegistered } from '@@lib/pwa/useServiceWorkerUpdate';
import { supabase } from '@@lib/supabase/client';

import { getNotificationPermissionState } from './permission';

const SW_READY_TIMEOUT_MS = 8_000;
const SW_CONTROLLER_TIMEOUT_MS = 5_000;

/**
 * The app registers the service worker at startup (see
 * `src/lib/pwa/useServiceWorkerUpdate.ts`), so reuse that registration rather
 * than racing a second `register()` — the dev build is served as a module and
 * would need different options.
 */
export const registerServiceWorker =
  async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;

    ensureRegistered();

    // Always await `ready` (not just getRegistration). On a freshly opened iOS
    // PWA the registration can exist while pushManager.subscribe still throws
    // InvalidStateError until an active worker is ready.
    const ready = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS)
      ),
    ]);
    if (!ready) return null;

    if (!navigator.serviceWorker.controller) {
      // Prompt-mode updates leave a waiting worker; claim so push can subscribe.
      ready.waiting?.postMessage({ type: 'SKIP_WAITING' });
      const controlling = await waitForServiceWorkerController(
        SW_CONTROLLER_TIMEOUT_MS
      );
      if (!controlling) return null;
    }

    return ready;
  };

/** True when this document is controlled by an active service worker. */
export const waitForServiceWorkerController = (
  timeoutMs: number
): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(false);
  }
  if (navigator.serviceWorker.controller) return Promise.resolve(true);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(Boolean(navigator.serviceWorker.controller));
    }, timeoutMs);

    const onChange = () => {
      if (!navigator.serviceWorker.controller) return;
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onChange);
  });
};

export type EnablePushResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'no-vapid'
        | 'unsupported'
        | 'ios-needs-install'
        | 'denied'
        | 'subscribe-failed'
        | 'persist-failed'
        | 'sw-not-ready';
    };

/** Request OS permission + store endpoint. Call only from Switch-on handlers. */
export const enablePushSubscription = async (
  userId: string
): Promise<EnablePushResult> => {
  const vapidKey =
    (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
    (typeof window !== 'undefined'
      ? (window as Window & { __QUACKER_E2E_VAPID__?: string }).__QUACKER_E2E_VAPID__
      : undefined);
  if (!vapidKey) return { ok: false, reason: 'no-vapid' };

  const state = getNotificationPermissionState();
  if (state === 'unsupported') return { ok: false, reason: 'unsupported' };
  if (state === 'ios-needs-install') {
    return { ok: false, reason: 'ios-needs-install' };
  }
  if (state === 'denied') return { ok: false, reason: 'denied' };

  const reg = await registerServiceWorker();
  if (!reg?.active) return { ok: false, reason: 'sw-not-ready' };

  const permission =
    state === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  let sub: PushSubscription | null = null;
  try {
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
  } catch (err) {
    console.error('pushManager.subscribe failed', err);
    // Existing subscription bound to a different VAPID key — drop and retry once.
    try {
      const stale = await reg.pushManager.getSubscription();
      await stale?.unsubscribe();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    } catch (retryErr) {
      console.error('pushManager.subscribe retry failed', retryErr);
      return { ok: false, reason: 'subscribe-failed' };
    }
  }

  if (!sub) return { ok: false, reason: 'subscribe-failed' };

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'subscribe-failed' };
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      group_id: null,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'user_id,endpoint' }
  );

  if (error) {
    console.error('push_subscriptions upsert failed', error);
    return { ok: false, reason: 'persist-failed' };
  }
  return { ok: true };
};

/** Best-effort remove this browser's endpoint (e.g. on logout). */
export const removeCurrentPushSubscription = async (
  userId: string
): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    // ignore
  }
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
};

/** @deprecated Use enablePushSubscription — kept for any stray imports. */
export const subscribeToPush = async (
  userId: string,
  _groupId?: string
): Promise<boolean> => {
  const result = await enablePushSubscription(userId);
  return result.ok;
};

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

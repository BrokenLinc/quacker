import React from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker registration, kept at module scope on purpose.
 *
 * `registerSW` creates a Workbox instance that owns the `waiting` worker
 * reference, so registering twice (StrictMode double-invokes effects) leaves
 * the prompt watching one instance while skip-waiting is sent to another — the
 * user clicks Reload and nothing happens.
 */
let updateSW: (() => Promise<void>) | undefined;
let registered = false;
let needRefresh = false;

const listeners = new Set<() => void>();

const setNeedRefresh = (value: boolean): void => {
  if (needRefresh === value) return;
  needRefresh = value;
  for (const listener of listeners) listener();
};

const ensureRegistered = (): void => {
  if (registered) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  registered = true;
  updateSW = registerSW({
    onNeedRefresh: () => setNeedRefresh(true),
    onRegisterError: () => {
      // Registration is optional — the app still works online without it.
    },
  });
};

let reloading = false;

/**
 * vite-plugin-pwa reloads on `controlling` only when a worker was already
 * controlling the page when it registered — so a visitor who installs the app
 * and then sees a deploy in the same session would click Reload and get
 * nothing. Reload on the first controller change after the user accepts.
 */
const reloadWhenControlled = (): void => {
  if (reloading) return;
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    },
    { once: true }
  );
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Reports when a new build is waiting. Activation is deliberately not
 * automatic: swapping the worker mid-session reloads the document, which would
 * discard the warm cache and any half-typed message.
 */
export const useServiceWorkerUpdate = (): {
  needRefresh: boolean;
  update: () => void;
} => {
  React.useEffect(ensureRegistered, []);

  const value = React.useSyncExternalStore(
    subscribe,
    () => needRefresh,
    () => false
  );

  const update = React.useCallback(() => {
    setNeedRefresh(false);
    reloadWhenControlled();
    // Posts SKIP_WAITING; the new worker then takes control.
    void updateSW?.();
  }, []);

  return { needRefresh: value, update };
};

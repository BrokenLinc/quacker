import { useEffect } from 'react';

import { useUnreadCounts } from '@@api';

const APP_NAME = 'Yowl';

/** Format a count for title / badge display (matches in-app IndicatorBadge). */
export const formatUnreadCount = (n: number): string =>
  n > 99 ? '99+' : String(n);

/** Sum per-group unread counts into a single total. */
export const sumUnreadCounts = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((sum, n) => sum + n, 0);

/** Build the document title from page label, unread total, and optional chirp. */
export const buildDocumentTitle = (options: {
  pageLabel: string | null;
  unreadTotal: number;
  chirpOverride: string | null;
}): string => {
  if (options.chirpOverride) return options.chirpOverride;
  const base = options.pageLabel
    ? `${options.pageLabel} - ${APP_NAME}`
    : APP_NAME;
  if (options.unreadTotal <= 0) return base;
  return `(${formatUnreadCount(options.unreadTotal)}) ${base}`;
};

type ChromeState = {
  pageLabel: string | null;
  unreadTotal: number;
  chirpOverride: string | null;
};

const state: ChromeState = {
  pageLabel: null,
  unreadTotal: 0,
  chirpOverride: null,
};

const commitTitle = (): void => {
  document.title = buildDocumentTitle(state);
};

export const setPageLabel = (label: string | null): void => {
  state.pageLabel = label;
  commitTitle();
};

export const setUnreadTotal = (total: number): void => {
  state.unreadTotal = Math.max(0, total);
  commitTitle();
};

export const setChirpOverride = (override: string | null): void => {
  state.chirpOverride = override;
  commitTitle();
};

type NavigatorWithBadge = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** Sync the PWA / OS icon badge via the Badging API (no-op when unsupported). */
export const syncAppBadge = (total: number): void => {
  const nav = navigator as NavigatorWithBadge;
  try {
    if (total > 0) {
      void nav.setAppBadge?.(total);
    } else {
      void nav.clearAppBadge?.();
    }
  } catch {
    // Badging API optional
  }
};

/**
 * Keeps document.title and the PWA icon badge in sync with total unread
 * across all groups (same RPC as Home / sidebar badges).
 */
export const useUnreadAppChrome = (options: {
  userId: string | undefined;
}): void => {
  const { userId } = options;
  const [counts] = useUnreadCounts({
    userId,
    channelId: 'app-chrome',
  });

  useEffect(() => {
    if (!userId) {
      setUnreadTotal(0);
      syncAppBadge(0);
      return;
    }
    const total = sumUnreadCounts(counts);
    setUnreadTotal(total);
    syncAppBadge(total);
  }, [userId, counts]);

  useEffect(() => {
    return () => {
      setUnreadTotal(0);
      syncAppBadge(0);
    };
  }, []);
};

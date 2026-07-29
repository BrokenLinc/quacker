import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@@lib/supabase/client';
import type { NotifyLevel } from '@@lib/notifications/shouldNotify';
import {
  enablePushSubscription,
  type EnablePushResult,
} from '@@lib/notifications/subscribe';

export type { NotifyLevel };

export type UserNotificationPrefs = {
  pushEnabled: boolean;
};

/** Load / upsert global push preference. */
export const getPushEnabled = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_notification_prefs')
    .select('push_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.push_enabled ?? false;
};

/**
 * Persist global preference. When enabling, runs OS permission + subscribe
 * (must be called from a user gesture). When disabling, only flips the flag.
 */
export const setPushEnabled = async (
  userId: string,
  enabled: boolean
): Promise<EnablePushResult | { ok: true }> => {
  if (enabled) {
    const sub = await enablePushSubscription(userId);
    if (!sub.ok) return sub;
  }

  const { error } = await supabase.from('user_notification_prefs').upsert(
    {
      user_id: userId,
      push_enabled: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
  return { ok: true };
};

export const updateMyNotifyLevel = async (
  groupId: string,
  userId: string,
  notifyLevel: NotifyLevel
): Promise<void> => {
  const { error } = await supabase
    .from('group_members')
    .update({ notify_level: notifyLevel })
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
};

export const usePushEnabled = (
  userId: string | undefined
): [
  boolean,
  boolean,
  (next: boolean) => Promise<EnablePushResult | { ok: true }>,
  (next: boolean) => void,
] => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPushEnabled(userId)
      .then((v) => {
        if (!cancelled) setEnabled(v);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const set = useCallback(
    async (next: boolean) => {
      if (!userId) return { ok: false as const, reason: 'unsupported' as const };
      const result = await setPushEnabled(userId, next);
      if (result.ok) setEnabled(next);
      return result;
    },
    [userId]
  );

  const syncLocal = useCallback((next: boolean) => {
    setEnabled(next);
  }, []);

  return [enabled, loading, set, syncLocal];
};

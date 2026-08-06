import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { queryClient } from '@@lib/query/client';
import { asHookResult, type HookResult } from '@@lib/query/hookResult';
import type { RealtimeTopic } from '@@lib/realtime/manager';
import { useRealtimeTopic } from '@@lib/realtime/useRealtimeTopic';
import { supabase } from '@@lib/supabase/client';

import { invalidateGroups } from './cache';
import { queryKeys } from './queryKeys';

const ADMIN_PAGE_SIZE = 30;

export type SiteSettings = {
  lockdown: boolean;
  updatedAt: number;
};

export type AdminGroupRow = {
  id: string;
  slug: string;
  name: string;
  creatorId: string;
  creatorDisplayName: string;
  creatorPhone: string;
  creatorPhotoURL: string | null;
  memberCount: number;
  messageCount: number;
  createdAt: number;
  deletedAt: number | null;
  deactivatedAt: number | null;
};

export type AdminUserRow = {
  userId: string;
  displayName: string;
  phone: string;
  photoURL: string | null;
  messageCount: number;
  roomCount: number;
  signedUpAt: number;
  superBannedAt: number | null;
};

const siteSettingsTopic: RealtimeTopic = {
  key: 'site-settings',
  configure: (channel) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_settings',
        filter: 'id=eq.true',
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object') {
          const row = payload.new as { lockdown?: boolean; updated_at?: string };
          queryClient.setQueryData(queryKeys.siteSettings(), {
            lockdown: Boolean(row.lockdown),
            updatedAt: row.updated_at
              ? new Date(row.updated_at).getTime()
              : Date.now(),
          } satisfies SiteSettings);
        }
      }
    );
  },
  resync: () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.siteSettings() });
  },
};

export const useSiteSettings = (): HookResult<SiteSettings> => {
  const query = useQuery({
    queryKey: queryKeys.siteSettings(),
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('lockdown, updated_at')
        .eq('id', true)
        .maybeSingle();
      if (error) throw error;
      return {
        lockdown: Boolean(data?.lockdown),
        updatedAt: data?.updated_at
          ? new Date(data.updated_at).getTime()
          : Date.now(),
      };
    },
  });

  useRealtimeTopic(siteSettingsTopic);
  return asHookResult(query, true);
};

export const setSiteLockdown = async (lockdown: boolean): Promise<void> => {
  const { error } = await supabase
    .from('site_settings')
    .update({ lockdown, updated_at: new Date().toISOString() })
    .eq('id', true);
  if (error) throw error;
  queryClient.setQueryData(queryKeys.siteSettings(), {
    lockdown,
    updatedAt: Date.now(),
  } satisfies SiteSettings);
};

export const useMySuperBan = (
  userId: string | undefined
): HookResult<{ superBannedAt: number | null }> => {
  const enabled = Boolean(userId);
  const query = useQuery({
    queryKey: queryKeys.userModeration(userId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_moderation')
        .select('super_banned_at')
        .eq('user_id', userId as string)
        .maybeSingle();
      if (error) throw error;
      return {
        superBannedAt: data?.super_banned_at
          ? new Date(data.super_banned_at).getTime()
          : null,
      };
    },
  });
  return asHookResult(query, enabled);
};

export const setUserSuperBanned = async (
  userId: string,
  banned: boolean,
  bannedBy: string
): Promise<void> => {
  const { error } = await supabase.from('user_moderation').upsert(
    {
      user_id: userId,
      super_banned_at: banned ? new Date().toISOString() : null,
      super_banned_by: banned ? bannedBy : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
  void queryClient.invalidateQueries({
    queryKey: queryKeys.userModeration(userId),
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsersRoot });
};

export const setGroupDeactivated = async (
  groupId: string,
  deactivated: boolean,
  actorId: string
): Promise<void> => {
  const { error } = await supabase
    .from('groups')
    .update({
      deactivated_at: deactivated ? new Date().toISOString() : null,
      deactivated_by: deactivated ? actorId : null,
    })
    .eq('id', groupId);
  if (error) throw error;
  void queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminGroupsRoot });
  invalidateGroups();
};

const mapAdminGroup = (row: {
  id: string;
  slug: string;
  name: string;
  creator_id: string;
  creator_display_name: string;
  creator_phone: string;
  creator_photo_url: string | null;
  member_count: number;
  message_count: number;
  created_at: string;
  deleted_at: string | null;
  deactivated_at: string | null;
}): AdminGroupRow => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  creatorId: row.creator_id,
  creatorDisplayName: row.creator_display_name,
  creatorPhone: row.creator_phone,
  creatorPhotoURL: row.creator_photo_url,
  memberCount: row.member_count,
  messageCount: row.message_count,
  createdAt: new Date(row.created_at).getTime(),
  deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
  deactivatedAt: row.deactivated_at
    ? new Date(row.deactivated_at).getTime()
    : null,
});

const mapAdminUser = (row: {
  user_id: string;
  display_name: string;
  phone: string;
  photo_url: string | null;
  message_count: number;
  room_count: number;
  signed_up_at: string;
  super_banned_at: string | null;
}): AdminUserRow => ({
  userId: row.user_id,
  displayName: row.display_name,
  phone: row.phone,
  photoURL: row.photo_url,
  messageCount: row.message_count,
  roomCount: row.room_count,
  signedUpAt: new Date(row.signed_up_at).getTime(),
  superBannedAt: row.super_banned_at
    ? new Date(row.super_banned_at).getTime()
    : null,
});

export const useAdminGroupsInfinite = (search: string) => {
  const q = search.trim();
  return useInfiniteQuery({
    queryKey: [...queryKeys.adminGroups(q)],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('admin_list_groups', {
        p_search: q || null,
        p_created_before: pageParam,
        p_limit: ADMIN_PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []).map(mapAdminGroup);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < ADMIN_PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last ? new Date(last.createdAt).toISOString() : undefined;
    },
  });
};

export const useAdminUsersInfinite = (search: string) => {
  const q = search.trim();
  return useInfiniteQuery({
    queryKey: [...queryKeys.adminUsers(q)],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('admin_list_users', {
        p_search: q || null,
        p_signed_up_before: pageParam,
        p_limit: ADMIN_PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? []).map(mapAdminUser);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < ADMIN_PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last ? new Date(last.signedUpAt).toISOString() : undefined;
    },
  });
};

export const useSetSiteLockdown = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setSiteLockdown,
    onMutate: async (lockdown) => {
      await qc.cancelQueries({ queryKey: queryKeys.siteSettings() });
      const prev = qc.getQueryData<SiteSettings>(queryKeys.siteSettings());
      if (prev) {
        qc.setQueryData(queryKeys.siteSettings(), { ...prev, lockdown });
      }
      return { prev };
    },
    onError: (_err, _lockdown, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.siteSettings(), ctx.prev);
    },
  });
};

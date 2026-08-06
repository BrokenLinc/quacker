import { useQuery } from '@tanstack/react-query';

import { queryClient } from '@@lib/query/client';
import { asHookResult, type HookResult } from '@@lib/query/hookResult';
import type { RealtimeTopic } from '@@lib/realtime/manager';
import { useRealtimeTopic } from '@@lib/realtime/useRealtimeTopic';
import { supabase } from '@@lib/supabase/client';
import type { NotifyLevel } from '@@lib/notifications/shouldNotify';
import type { GroupMemberRole } from '@@lib/moderation/memberPermissions';
import type {
  Database,
  GroupMemberRow,
  GroupRow,
  GroupSilenceRow,
  MessageRow,
} from '@@lib/supabase/types';
import { generateSlug } from '@@lib/share';

import {
  invalidateGroups,
  invalidateUnreadCounts,
} from './cache';
import { applyMessageInsert, rowToMessage } from './message';
import { queryKeys } from './queryKeys';

type GroupUpdate = Database['public']['Tables']['groups']['Update'];

/** App-level group (legacy field names for minimal page churn). */
export interface Group {
  id: string;
  uid: string;
  slug: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  time: number;
  name: string;
  deletedAt: number | null;
  deactivatedAt: number | null;
}

export interface GroupMember {
  groupId: string;
  uid: string;
  role: GroupMemberRole;
  displayName: string | null;
  photoURL: string | null;
  phoneLast4: string | null;
  joinedAt: number;
  notifyLevel: NotifyLevel;
}

/** Persistent silence row (survives leave/rejoin). */
export interface GroupSilence {
  groupId: string;
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  silencedBy: string | null;
  createdAt: number;
}

const rowToGroup = (row: GroupRow): Group => ({
  id: row.id,
  uid: row.creator_id,
  slug: row.slug,
  authorName: row.author_name,
  authorPhotoURL: row.author_photo_url,
  time: new Date(row.created_at).getTime(),
  name: row.name,
  deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
  deactivatedAt: row.deactivated_at
    ? new Date(row.deactivated_at).getTime()
    : null,
});

const rowToGroupMember = (row: GroupMemberRow): GroupMember => ({
  groupId: row.group_id,
  uid: row.user_id,
  role: row.role,
  displayName: row.display_name,
  photoURL: row.photo_url,
  phoneLast4: row.phone_last4,
  joinedAt: new Date(row.joined_at).getTime(),
  notifyLevel: row.notify_level ?? 'all',
});

const rowToGroupSilence = (row: GroupSilenceRow): GroupSilence => ({
  groupId: row.group_id,
  uid: row.user_id,
  displayName: row.display_name,
  photoURL: row.photo_url,
  silencedBy: row.silenced_by,
  createdAt: new Date(row.created_at).getTime(),
});

/* ------------------------------------------------------------------ */
/* Realtime topics (module-level so handlers can never capture stale   */
/* render state — see src/lib/realtime/manager.ts)                     */
/* ------------------------------------------------------------------ */

const groupTopic = (groupId: string): RealtimeTopic => ({
  key: `group-doc:${groupId}`,
  configure: (channel) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'groups',
        filter: `id=eq.${groupId}`,
      },
      (payload) => {
        const key = queryKeys.group(groupId);
        if (payload.eventType === 'DELETE') {
          queryClient.setQueryData(key, null);
        } else if (payload.new) {
          queryClient.setQueryData(key, rowToGroup(payload.new as GroupRow));
        }
      }
    );
  },
  resync: () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
  },
});

const groupsListTopic = (userId: string): RealtimeTopic => ({
  key: `groups-list:${userId}`,
  configure: (channel) => {
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => invalidateGroups()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${userId}`,
        },
        () => invalidateGroups()
      );
  },
  resync: invalidateGroups,
});

const groupMembersTopic = (groupId: string): RealtimeTopic => ({
  key: `group-members:${groupId}`,
  configure: (channel) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_members',
        filter: `group_id=eq.${groupId}`,
      },
      () => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.groupMembers(groupId),
        });
      }
    );
  },
  resync: () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.groupMembers(groupId),
    });
  },
});

const groupSilencesTopic = (groupId: string): RealtimeTopic => ({
  key: `group-silences:${groupId}`,
  configure: (channel) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_silences',
        filter: `group_id=eq.${groupId}`,
      },
      () => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.groupSilences(groupId),
        });
      }
    );
  },
  resync: () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.groupSilences(groupId),
    });
  },
});

/**
 * App-wide unread topic. Also merges inserts into any room that is already
 * cached, so opening a room you were notified about is instant.
 */
const unreadCountsTopic = (userId: string): RealtimeTopic => ({
  key: `unread-counts:${userId}`,
  configure: (channel) => {
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new) applyMessageInsert(rowToMessage(payload.new as MessageRow));
          invalidateUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${userId}`,
        },
        () => invalidateUnreadCounts()
      );
  },
  resync: invalidateUnreadCounts,
});

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export const useGroup = (id: string): HookResult<Group> => {
  const enabled = Boolean(id);

  const query = useQuery({
    queryKey: queryKeys.group(id),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToGroup(data) : null;
    },
  });

  useRealtimeTopic(enabled ? groupTopic(id) : null);

  return asHookResult(query, enabled);
};

export const useGroupBySlug = (slug: string): HookResult<Group> => {
  const enabled = Boolean(slug);

  const query = useQuery({
    queryKey: queryKeys.groupBySlug(slug),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToGroup(data) : null;
    },
  });

  return asHookResult(query, enabled);
};

/**
 * Groups the given user belongs to (never the global list — membership is the
 * privacy boundary for a private chat product).
 */
export const useGroups = (options: {
  userId: string | undefined;
  limit?: number;
}): HookResult<Group[]> => {
  const { userId } = options;
  const limit = options.limit ?? 100;
  const enabled = Boolean(userId);

  const query = useQuery({
    queryKey: queryKeys.groups(userId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members!inner(user_id)')
        .eq('group_members.user_id', userId as string)
        .is('deleted_at', null)
        .is('deactivated_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(rowToGroup);
    },
  });

  useRealtimeTopic(userId ? groupsListTopic(userId) : null);

  return asHookResult(query, enabled);
};

export const useGroupMembers = (groupId: string): HookResult<GroupMember[]> => {
  const enabled = Boolean(groupId);

  const query = useQuery({
    queryKey: queryKeys.groupMembers(groupId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToGroupMember);
    },
  });

  useRealtimeTopic(enabled ? groupMembersTopic(groupId) : null);

  return asHookResult(query, enabled);
};

export const useGroupSilences = (
  groupId: string
): HookResult<GroupSilence[]> => {
  const enabled = Boolean(groupId);

  const query = useQuery({
    queryKey: queryKeys.groupSilences(groupId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_silences')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToGroupSilence);
    },
  });

  useRealtimeTopic(enabled ? groupSilencesTopic(groupId) : null);

  return asHookResult(query, enabled);
};

/**
 * Whether the user belongs to a room. Cached so returning to a room does not
 * re-run the membership probe behind a skeleton.
 */
export const useGroupMembership = (
  groupId: string,
  userId: string | undefined
): HookResult<boolean> => {
  const enabled = Boolean(groupId && userId);

  const query = useQuery({
    queryKey: queryKeys.membership(groupId, userId ?? ''),
    enabled,
    queryFn: () => isGroupMember(groupId, userId as string),
  });

  return asHookResult(query, enabled);
};

/**
 * Unread message counts per group for the signed-in user, filtered by that
 * membership's notify_level (silenced → 0).
 */
export const useUnreadCounts = (options: {
  userId: string | undefined;
}): [Record<string, number>, boolean] => {
  const { userId } = options;
  const enabled = Boolean(userId);

  const query = useQuery({
    queryKey: queryKeys.unreadCounts(userId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('unread_message_counts');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const n = Number(row.count);
        if (n > 0) counts[row.group_id] = n;
      }
      return counts;
    },
  });

  useRealtimeTopic(userId ? unreadCountsTopic(userId) : null);

  return [query.data ?? {}, enabled ? query.isPending : false];
};

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export const addGroup = async (data: {
  uid: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  name: string;
  slug?: string;
  phoneLast4?: string | null;
}) => {
  const slug = data.slug ?? generateSlug();
  const { data: row, error } = await supabase
    .from('groups')
    .insert({
      creator_id: data.uid,
      slug,
      name: data.name,
      author_name: data.authorName,
      author_photo_url: data.authorPhotoURL,
    })
    .select()
    .single();

  if (error) throw error;

  // The creator-membership trigger runs in the same transaction, but Realtime
  // can lag a beat — wait until the membership is queryable so the sidebar
  // join is never empty, then invalidate so every list refetches.
  for (let i = 0; i < 20; i++) {
    if (await isGroupMember(row.id, data.uid)) break;
    await new Promise((r) => setTimeout(r, 50));
  }

  // Trigger only copies display_name/photo_url — patch phone last-4 for chrome.
  if (data.phoneLast4) {
    await supabase
      .from('group_members')
      .update({ phone_last4: data.phoneLast4 })
      .eq('group_id', row.id)
      .eq('user_id', data.uid);
  }

  queryClient.setQueryData(queryKeys.membership(row.id, data.uid), true);
  invalidateGroups();

  return { id: row.id, slug: row.slug };
};

export const updateGroup = async (id: string, data: Partial<Group>) => {
  const patch: GroupUpdate = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.slug !== undefined) patch.slug = data.slug;

  const { error } = await supabase.from('groups').update(patch).eq('id', id);
  if (error) throw error;
  void queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
};

export const deleteGroup = async (id: string, actorId: string) => {
  const { error } = await supabase
    .from('groups')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: actorId,
    })
    .eq('id', id);
  if (error) throw error;
  queryClient.removeQueries({ queryKey: queryKeys.messages(id) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
  invalidateGroups();
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminGroupsRoot });
};

export const restoreDeletedGroup = async (id: string) => {
  const { error } = await supabase
    .from('groups')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', id);
  if (error) throw error;
  void queryClient.invalidateQueries({ queryKey: queryKeys.group(id) });
  invalidateGroups();
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminGroupsRoot });
};

export const joinGroup = async (
  groupId: string,
  member: {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    phoneLast4?: string | null;
    notifyLevel?: NotifyLevel;
  }
) => {
  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: member.uid,
    role: 'member',
    display_name: member.displayName,
    photo_url: member.photoURL,
    phone_last4: member.phoneLast4 ?? null,
    notify_level: member.notifyLevel ?? 'all',
  });
  // Creator already inserted by trigger; ignore duplicate member rows
  if (error && error.code !== '23505') throw error;
  queryClient.setQueryData(queryKeys.membership(groupId, member.uid), true);
  invalidateGroups();
};

export const leaveGroup = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
  queryClient.setQueryData(queryKeys.membership(groupId, userId), false);
  queryClient.removeQueries({ queryKey: queryKeys.messages(groupId) });
  invalidateGroups();
};

export const setMemberSilenced = async (
  groupId: string,
  userId: string,
  silenced: boolean,
  profile?: { displayName?: string | null; photoURL?: string | null }
) => {
  if (silenced) {
    const { data: sessionData } = await supabase.auth.getSession();
    const silencedBy = sessionData.session?.user.id ?? null;
    const { error } = await supabase.from('group_silences').upsert(
      {
        group_id: groupId,
        user_id: userId,
        display_name: profile?.displayName ?? null,
        photo_url: profile?.photoURL ?? null,
        silenced_by: silencedBy,
      },
      { onConflict: 'group_id,user_id' }
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('group_silences')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
  }
  void queryClient.invalidateQueries({
    queryKey: queryKeys.groupSilences(groupId),
  });
};

export const setMemberMod = async (
  groupId: string,
  userId: string,
  isMod: boolean
) => {
  const { error } = await supabase
    .from('group_members')
    .update({ role: isMod ? 'mod' : 'member' })
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
  void queryClient.invalidateQueries({
    queryKey: queryKeys.groupMembers(groupId),
  });
};

/** Sync denormalized member profile fields across all groups (after rename). */
export const updateMyMemberProfile = async (
  userId: string,
  profile: {
    displayName: string | null;
    photoURL: string | null;
    phoneLast4?: string | null;
  }
) => {
  const patch: {
    display_name: string | null;
    photo_url: string | null;
    phone_last4?: string | null;
  } = {
    display_name: profile.displayName,
    photo_url: profile.photoURL,
  };
  if (profile.phoneLast4 !== undefined) {
    patch.phone_last4 = profile.phoneLast4;
  }
  const { error } = await supabase
    .from('group_members')
    .update(patch)
    .eq('user_id', userId);
  if (error) throw error;
  void queryClient.invalidateQueries({ queryKey: queryKeys.groupMembersRoot });
};

export const isGroupMember = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
};

/** Mark the current user's membership as viewed (clears unread for this group). */
export const markGroupViewed = async (
  groupId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('group_members')
    .update({ last_viewed_at: new Date().toISOString() })
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
  invalidateUnreadCounts();
};

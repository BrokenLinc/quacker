import { useCallback, useEffect, useId, useState } from 'react';

import { supabase } from '@@lib/supabase/client';
import type { NotifyLevel } from '@@lib/notifications/shouldNotify';
import type {
  Database,
  GroupMemberRow,
  GroupRow,
} from '@@lib/supabase/types';
import { generateSlug } from '@@lib/share';

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
}

export interface GroupMember {
  groupId: string;
  uid: string;
  role: 'creator' | 'member';
  displayName: string | null;
  photoURL: string | null;
  joinedAt: number;
  notifyLevel: NotifyLevel;
}

const rowToGroup = (row: GroupRow): Group => ({
  id: row.id,
  uid: row.creator_id,
  slug: row.slug,
  authorName: row.author_name,
  authorPhotoURL: row.author_photo_url,
  time: new Date(row.created_at).getTime(),
  name: row.name,
});

const rowToGroupMember = (row: GroupMemberRow): GroupMember => ({
  groupId: row.group_id,
  uid: row.user_id,
  role: row.role,
  displayName: row.display_name,
  photoURL: row.photo_url,
  joinedAt: new Date(row.joined_at).getTime(),
  notifyLevel: row.notify_level ?? 'all',
});

type HookResult<T> = [T | undefined, boolean, Error | undefined];

/** Broadcast so every mounted useGroups refetches after local mutations. */
const GROUPS_CHANGED_EVENT = 'quacker:groups-changed';

/** Broadcast so unread badge hooks refetch after mark-viewed / prefs. */
const UNREAD_CHANGED_EVENT = 'quacker:unread-changed';

const notifyGroupsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(GROUPS_CHANGED_EVENT));
  }
};

export const notifyUnreadChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT));
  }
};

export const useGroup = (
  id: string,
  options?: { channelId?: string }
): HookResult<Group> => {
  const channelId = options?.channelId ?? 'default';
  const [group, setGroup] = useState<Group | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchGroup = async () => {
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) setError(fetchError);
      else setGroup(data ? rowToGroup(data) : undefined);
      setLoading(false);
    };

    fetchGroup();

    const channel = supabase
      .channel(`group-doc:${id}:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setGroup(undefined);
          } else if (payload.new) {
            setGroup(rowToGroup(payload.new as GroupRow));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, id]);

  return [group, loading, error];
};

export const useGroupBySlug = (slug: string): HookResult<Group> => {
  const [group, setGroup] = useState<Group | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    if (!slug) return;

    const fetchGroup = async () => {
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (fetchError) setError(fetchError);
      else setGroup(data ? rowToGroup(data) : undefined);
      setLoading(false);
    };

    fetchGroup();
  }, [slug]);

  return [group, loading, error];
};

/**
 * Groups the given user belongs to (never the global list — membership is the
 * privacy boundary for a private chat product).
 */
export const useGroups = (options: {
  userId: string | undefined;
  limit?: number;
  /** Unique Realtime channel suffix — required when multiple hooks subscribe in one view. */
  channelId?: string;
}): HookResult<Group[]> => {
  const { userId } = options;
  const limit = options.limit ?? 100;
  const channelId = options.channelId ?? 'default';
  const [groups, setGroups] = useState<Group[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  const fetchGroups = useCallback(async () => {
    if (!userId) return;
    const { data, error: fetchError } = await supabase
      .from('groups')
      .select('*, group_members!inner(user_id)')
      .eq('group_members.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) setError(fetchError);
    else setGroups(data?.map(rowToGroup) ?? []);
    setLoading(false);
  }, [limit, userId]);

  useEffect(() => {
    if (!userId) {
      setGroups(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchGroups();

    const onLocalChange = () => fetchGroups();
    window.addEventListener(GROUPS_CHANGED_EVENT, onLocalChange);

    const channel = supabase
      .channel(`groups-list:${userId}:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => fetchGroups()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchGroups()
      )
      .subscribe();

    return () => {
      window.removeEventListener(GROUPS_CHANGED_EVENT, onLocalChange);
      supabase.removeChannel(channel);
    };
  }, [channelId, fetchGroups, userId]);

  return [groups, loading, error];
};

export const useGroupMembers = (
  groupId: string,
  options?: { channelId?: string }
): HookResult<GroupMember[]> => {
  // supabase.channel(name) reuses an existing channel — concurrent mounts with
  // the same name cannot add .on() after the first .subscribe().
  const instanceId = useId();
  const channelId = options?.channelId ?? instanceId;
  const [members, setMembers] = useState<GroupMember[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  const fetchMembers = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (fetchError) setError(fetchError);
    else setMembers(data?.map(rowToGroupMember) ?? []);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    fetchMembers();

    const channel = supabase
      .channel(`group-members:${groupId}:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, fetchMembers, groupId]);

  return [members, loading, error];
};

export const addGroup = async (data: {
  uid: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  name: string;
  slug?: string;
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
  // join is never empty, then broadcast so every useGroups remounts.
  for (let i = 0; i < 20; i++) {
    if (await isGroupMember(row.id, data.uid)) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  notifyGroupsChanged();

  return { id: row.id, slug: row.slug };
};

export const updateGroup = async (id: string, data: Partial<Group>) => {
  const patch: GroupUpdate = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.slug !== undefined) patch.slug = data.slug;

  const { error } = await supabase.from('groups').update(patch).eq('id', id);
  if (error) throw error;
};

export const deleteGroup = async (id: string) => {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
  notifyGroupsChanged();
};

export const joinGroup = async (
  groupId: string,
  member: {
    uid: string;
    displayName: string | null;
    photoURL: string | null;
    notifyLevel?: NotifyLevel;
  }
) => {
  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: member.uid,
    role: 'member',
    display_name: member.displayName,
    photo_url: member.photoURL,
    notify_level: member.notifyLevel ?? 'all',
  });
  // Creator already inserted by trigger; ignore duplicate member rows
  if (error && error.code !== '23505') throw error;
  notifyGroupsChanged();
};

export const leaveGroup = async (groupId: string, userId: string) => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
  notifyGroupsChanged();
};

export const removeGroupMember = leaveGroup;

/** Sync denormalized member profile fields across all groups (after rename). */
export const updateMyMemberProfile = async (
  userId: string,
  profile: { displayName: string | null; photoURL: string | null }
) => {
  const { error } = await supabase
    .from('group_members')
    .update({
      display_name: profile.displayName,
      photo_url: profile.photoURL,
    })
    .eq('user_id', userId);
  if (error) throw error;
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
  notifyUnreadChanged();
};

/**
 * Unread message counts per group for the signed-in user, filtered by that
 * membership's notify_level (silenced → 0).
 */
export const useUnreadCounts = (options: {
  userId: string | undefined;
  channelId?: string;
}): [Record<string, number>, boolean] => {
  const { userId } = options;
  const channelId = options.channelId ?? 'default';
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!userId) return;
    const { data, error: fetchError } = await supabase.rpc(
      'unread_message_counts'
    );
    if (fetchError) {
      setCounts({});
    } else {
      const next: Record<string, number> = {};
      for (const row of data ?? []) {
        const n = Number(row.count);
        if (n > 0) next[row.group_id] = n;
      }
      setCounts(next);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCounts({});
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchCounts();

    const onLocalChange = () => fetchCounts();
    window.addEventListener(GROUPS_CHANGED_EVENT, onLocalChange);
    window.addEventListener(UNREAD_CHANGED_EVENT, onLocalChange);

    const channel = supabase
      .channel(`unread-counts:${userId}:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      window.removeEventListener(GROUPS_CHANGED_EVENT, onLocalChange);
      window.removeEventListener(UNREAD_CHANGED_EVENT, onLocalChange);
      supabase.removeChannel(channel);
    };
  }, [channelId, fetchCounts, userId]);

  return [counts, loading];
};

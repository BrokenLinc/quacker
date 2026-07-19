import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@@lib/supabase/client';
import type { Database, GroupRow } from '@@lib/supabase/types';
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

const rowToGroup = (row: GroupRow): Group => ({
  id: row.id,
  uid: row.creator_id,
  slug: row.slug,
  authorName: row.author_name,
  authorPhotoURL: row.author_photo_url,
  time: new Date(row.created_at).getTime(),
  name: row.name,
});

type HookResult<T> = [T | undefined, boolean, Error | undefined];

export const useGroup = (id: string): HookResult<Group> => {
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
      .channel(`group-doc:${id}`)
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
  }, [id]);

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

export const useGroups = (options?: {
  limit?: number;
  /** Unique Realtime channel suffix — required when multiple hooks subscribe in one view. */
  channelId?: string;
}): HookResult<Group[]> => {
  const limit = options?.limit ?? 1000;
  const channelId = options?.channelId ?? 'default';
  const [groups, setGroups] = useState<Group[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  const fetchGroups = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) setError(fetchError);
    else setGroups(data?.map(rowToGroup) ?? []);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchGroups();

    const channel = supabase
      .channel(`groups-list:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => fetchGroups()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, fetchGroups]);

  return [groups, loading, error];
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
  return { id: row.id, slug: row.slug };
};

export const updateGroup = async (id: string, data: Partial<Group>) => {
  const patch: GroupUpdate = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.slug !== undefined) patch.slug = data.slug;

  const { error } = await supabase.from('groups').update(patch).eq('id', id);
  if (error) throw error;
};

export const ensureGroupMember = async (groupId: string, userId: string) => {
  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: userId,
    role: 'member',
  });
  // Creator already inserted by trigger; ignore duplicate member rows
  if (error && error.code !== '23505') throw error;
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

import { useQuery } from '@tanstack/react-query';

import { queryClient } from '@@lib/query/client';
import { asHookResult, type HookResult } from '@@lib/query/hookResult';
import type { RealtimeTopic } from '@@lib/realtime/manager';
import { useRealtimeTopic } from '@@lib/realtime/useRealtimeTopic';
import { supabase } from '@@lib/supabase/client';
import type { MessageRow } from '@@lib/supabase/types';

import {
  MESSAGE_CACHE_MAX,
  deltaHasGap,
  deltaSinceMs,
  mergeMessages,
  sortMessages,
  trimMessages,
} from './messageSync';
import { queryKeys } from './queryKeys';

export interface Message {
  id: string;
  uid: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  time: number;
  text: string;
  groupId: string;
  isAnnouncement: boolean;
}

export const rowToMessage = (row: MessageRow): Message => ({
  id: row.id,
  uid: row.author_id,
  authorName: row.author_name,
  authorPhotoURL: row.author_photo_url,
  time: new Date(row.created_at).getTime(),
  text: row.text,
  groupId: row.group_id,
  isAnnouncement: row.is_announcement ?? false,
});

const DEFAULT_MESSAGE_LIMIT = 100;

const cachedMessages = (groupId: string): Message[] | undefined =>
  queryClient.getQueryData<Message[]>(queryKeys.messages(groupId));

const fetchNewest = async (
  groupId: string,
  limit: number
): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return sortMessages((data ?? []).map(rowToMessage));
};

/**
 * Fetch messages for a room, incrementally when possible.
 *
 * With nothing cached this reads the newest page. With a warm cache it reads
 * only rows at or after the newest cached message (minus an overlap window) and
 * merges them, so re-entering a room or resuming from the background costs one
 * small query instead of a full page.
 */
export const fetchGroupMessages = async (
  groupId: string,
  limit: number = DEFAULT_MESSAGE_LIMIT
): Promise<Message[]> => {
  const cached = cachedMessages(groupId);
  const since = deltaSinceMs(cached);

  if (since === null || !cached) return fetchNewest(groupId, limit);

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .gte('created_at', new Date(since).toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = data ?? [];
  // A full page of deltas means rows may have been skipped between the overlap
  // window and this page — fall back to a clean read.
  if (deltaHasGap(rows.length, limit)) return fetchNewest(groupId, limit);

  const merged = mergeMessages(cached, rows.map(rowToMessage));
  return trimMessages(merged, Math.max(limit, MESSAGE_CACHE_MAX));
};

/**
 * Merge a single row into a room's cached messages. Used by Realtime inserts and
 * by pushes that arrive while the app is backgrounded, so no round-trip is
 * needed to show a new message.
 *
 * Only touches rooms that are already cached — seeding a fresh cache from one
 * message would render a list with a hole in it.
 */
export const applyMessageInsert = (message: Message): void => {
  const key = queryKeys.messages(message.groupId);
  const cached = queryClient.getQueryData<Message[]>(key);
  if (!cached) return;
  queryClient.setQueryData(
    key,
    trimMessages(mergeMessages(cached, [message]), MESSAGE_CACHE_MAX)
  );
};

const applyMessageDelete = (groupId: string, messageId: string): void => {
  const key = queryKeys.messages(groupId);
  const cached = queryClient.getQueryData<Message[]>(key);
  if (!cached) return;
  queryClient.setQueryData(
    key,
    cached.filter((message) => message.id !== messageId)
  );
};

/**
 * Realtime for one room's messages. Rows are merged straight from the payload —
 * the previous implementation refetched the whole page on every event.
 */
export const groupMessagesTopic = (groupId: string): RealtimeTopic => ({
  key: `group-messages:${groupId}`,
  configure: (channel) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as Partial<MessageRow> | undefined;
          if (old?.id) applyMessageDelete(groupId, old.id);
          return;
        }
        if (payload.new) applyMessageInsert(rowToMessage(payload.new as MessageRow));
      }
    );
  },
  resync: () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.messages(groupId) });
  },
});

/** Messages in chronological order (oldest first) — chat display order. */
export const useGroupMessages = (
  groupId: string,
  options?: { limit?: number }
): HookResult<Message[]> => {
  const limit = options?.limit ?? DEFAULT_MESSAGE_LIMIT;
  const enabled = Boolean(groupId);

  const query = useQuery({
    queryKey: queryKeys.messages(groupId),
    queryFn: () => fetchGroupMessages(groupId, limit),
    enabled,
  });

  useRealtimeTopic(enabled ? groupMessagesTopic(groupId) : null);

  return asHookResult(query, enabled);
};

export const addMessage = async (data: {
  /** Client-generated id, so retries are idempotent (insert conflicts on PK). */
  id?: string;
  uid: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  text: string;
  groupId: string;
}) => {
  const { error } = await supabase.from('messages').insert({
    ...(data.id ? { id: data.id } : {}),
    group_id: data.groupId,
    author_id: data.uid,
    author_name: data.authorName,
    author_photo_url: data.authorPhotoURL,
    text: data.text,
  });

  if (error) throw error;
};

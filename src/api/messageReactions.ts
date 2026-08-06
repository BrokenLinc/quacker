import { useQuery } from '@tanstack/react-query';

import {
  isReactionEmoji,
  type ReactionEmoji,
} from '@@lib/chat/reactionEmojis';
import { queryClient } from '@@lib/query/client';
import { asHookResult, type HookResult } from '@@lib/query/hookResult';
import type { RealtimeTopic } from '@@lib/realtime/manager';
import { useRealtimeTopic } from '@@lib/realtime/useRealtimeTopic';
import { supabase } from '@@lib/supabase/client';
import type { MessageReactionRow } from '@@lib/supabase/types';

import { queryKeys } from './queryKeys';

export type MessageReaction = {
  messageId: string;
  groupId: string;
  userId: string;
  emoji: ReactionEmoji;
  createdAt: number;
};

export const rowToMessageReaction = (
  row: MessageReactionRow
): MessageReaction | null => {
  if (!isReactionEmoji(row.emoji)) return null;
  return {
    messageId: row.message_id,
    groupId: row.group_id,
    userId: row.user_id,
    emoji: row.emoji,
    createdAt: new Date(row.created_at).getTime(),
  };
};

const reactionKey = (reaction: MessageReaction): string =>
  `${reaction.messageId}:${reaction.userId}:${reaction.emoji}`;

export const mergeReactions = (
  existing: MessageReaction[],
  incoming: MessageReaction[]
): MessageReaction[] => {
  const byKey = new Map(existing.map((row) => [reactionKey(row), row]));
  for (const row of incoming) {
    byKey.set(reactionKey(row), row);
  }
  return Array.from(byKey.values()).sort((a, b) => a.createdAt - b.createdAt);
};

export const applyReactionInsert = (reaction: MessageReaction): void => {
  const key = queryKeys.messageReactions(reaction.groupId);
  const cached = queryClient.getQueryData<MessageReaction[]>(key);
  if (!cached) return;
  queryClient.setQueryData(key, mergeReactions(cached, [reaction]));
};

export const applyReactionDelete = (
  groupId: string,
  messageId: string,
  userId: string,
  emoji: string
): void => {
  const key = queryKeys.messageReactions(groupId);
  const cached = queryClient.getQueryData<MessageReaction[]>(key);
  if (!cached) return;
  queryClient.setQueryData(
    key,
    cached.filter(
      (row) =>
        !(
          row.messageId === messageId &&
          row.userId === userId &&
          row.emoji === emoji
        )
    )
  );
};

export const fetchGroupMessageReactions = async (
  groupId: string
): Promise<MessageReaction[]> => {
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? [])
    .map((row) => rowToMessageReaction(row as MessageReactionRow))
    .filter((row): row is MessageReaction => row !== null);
};

export const groupMessageReactionsTopic = (
  groupId: string
): RealtimeTopic => ({
  key: `group-message-reactions:${groupId}`,
  configure: (channel) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as Partial<MessageReactionRow> | undefined;
          if (old?.message_id && old?.user_id && old?.emoji) {
            applyReactionDelete(
              groupId,
              old.message_id,
              old.user_id,
              old.emoji
            );
          }
          return;
        }
        if (payload.new) {
          const mapped = rowToMessageReaction(
            payload.new as MessageReactionRow
          );
          if (mapped) applyReactionInsert(mapped);
        }
      }
    );
  },
  resync: () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.messageReactions(groupId),
    });
  },
});

export const useGroupMessageReactions = (
  groupId: string
): HookResult<MessageReaction[]> => {
  const enabled = Boolean(groupId);

  const query = useQuery({
    queryKey: queryKeys.messageReactions(groupId),
    queryFn: () => fetchGroupMessageReactions(groupId),
    enabled,
  });

  useRealtimeTopic(enabled ? groupMessageReactionsTopic(groupId) : null);

  return asHookResult(query, enabled);
};

export const toggleMessageReaction = async (
  messageId: string,
  groupId: string,
  userId: string,
  emoji: ReactionEmoji,
  currentlyReacted: boolean
): Promise<void> => {
  if (currentlyReacted) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) throw error;
    applyReactionDelete(groupId, messageId, userId, emoji);
    return;
  }

  const { data, error } = await supabase
    .from('message_reactions')
    .insert({
      message_id: messageId,
      group_id: groupId,
      user_id: userId,
      emoji,
    })
    .select('*')
    .single();

  if (error) {
    // Concurrent toggle / retry — treat duplicate as success.
    if (error.code === '23505') {
      applyReactionInsert({
        messageId,
        groupId,
        userId,
        emoji,
        createdAt: Date.now(),
      });
      return;
    }
    throw error;
  }

  const mapped = rowToMessageReaction(data as MessageReactionRow);
  if (mapped) applyReactionInsert(mapped);
};

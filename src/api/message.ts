import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@@lib/supabase/client';
import type { MessageRow } from '@@lib/supabase/types';

export interface Message {
  id: string;
  uid: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  time: number;
  text: string;
  groupId: string;
}

const rowToMessage = (row: MessageRow): Message => ({
  id: row.id,
  uid: row.author_id,
  authorName: row.author_name,
  authorPhotoURL: row.author_photo_url,
  time: new Date(row.created_at).getTime(),
  text: row.text,
  groupId: row.group_id,
});

type HookResult<T> = [T | undefined, boolean, Error | undefined];

export const useGroupMessages = (
  groupId: string,
  options?: { limit: number }
): HookResult<Message[]> => {
  const limit = options?.limit ?? 1000;
  const [messages, setMessages] = useState<Message[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  const fetchMessages = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) setError(fetchError);
    else setMessages(data?.map(rowToMessage) ?? []);
    setLoading(false);
  }, [groupId, limit]);

  useEffect(() => {
    if (!groupId) return;

    fetchMessages();

    // Realtime: re-fetch on any message change for this group
    const channel = supabase
      .channel(`group-messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchMessages]);

  return [messages, loading, error];
};

export const useMessages = (options?: { limit: number }): HookResult<Message[]> => {
  const limit = options?.limit ?? 1000;
  const [messages, setMessages] = useState<Message[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) setError(fetchError);
      else setMessages(data?.map(rowToMessage) ?? []);
      setLoading(false);
    };

    fetchMessages();
  }, [limit]);

  return [messages, loading, error];
};

export const addMessage = async (data: {
  uid: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  text: string;
  groupId: string;
}) => {
  const { error } = await supabase.from('messages').insert({
    group_id: data.groupId,
    author_id: data.uid,
    author_name: data.authorName,
    author_photo_url: data.authorPhotoURL,
    text: data.text,
  });

  if (error) throw error;
};

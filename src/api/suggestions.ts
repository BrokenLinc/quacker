import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { queryClient } from '@@lib/query/client';
import { asHookResult, type HookResult } from '@@lib/query/hookResult';
import type { RealtimeTopic } from '@@lib/realtime/manager';
import { useRealtimeTopic } from '@@lib/realtime/useRealtimeTopic';
import { supabase } from '@@lib/supabase/client';
import type {
  SuggestionCategory,
  SuggestionCommentRow,
  SuggestionRow,
  SuggestionStatus,
} from '@@lib/supabase/types';

import {
  invalidateSuggestionComments,
  invalidateSuggestions,
  retrySuggestion,
} from './cache';
import { queryKeys } from './queryKeys';

export type { SuggestionCategory, SuggestionStatus };

/** App-level suggestion with whether the current user has upvoted. */
export interface Suggestion {
  id: string;
  authorId: string;
  authorDisplayName: string | null;
  title: string;
  body: string;
  category: SuggestionCategory;
  status: SuggestionStatus;
  voteCount: number;
  commentCount: number;
  createdAt: number;
  updatedAt: number;
  /** True when the signed-in user has an upvote on this suggestion. */
  votedByMe: boolean;
}

export interface SuggestionComment {
  id: string;
  suggestionId: string;
  authorId: string;
  authorDisplayName: string | null;
  body: string;
  createdAt: number;
}

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  feature_request: 'Feature request',
  bug_report: 'Bug report',
  other: 'Other',
};

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  new: 'New',
  under_review: 'Under review',
  in_development: 'In development',
  done: 'Done',
};

export const SUGGESTION_STATUSES: SuggestionStatus[] = [
  'new',
  'under_review',
  'in_development',
  'done',
];

export const SUGGESTION_COMMENT_BODY_MAX = 1000;

const SUGGESTIONS_LIMIT = 500;
const COMMENTS_LIMIT = 500;

const SUGGESTIONS_CHANGED_EVENT = 'quacker:suggestions-changed';

const notifySuggestionsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SUGGESTIONS_CHANGED_EVENT));
  }
  invalidateSuggestions();
};

const rowToSuggestion = (
  row: SuggestionRow,
  votedByMe: boolean
): Suggestion => ({
  id: row.id,
  authorId: row.author_id,
  authorDisplayName: row.author_display_name,
  title: row.title,
  body: row.body,
  category: row.category,
  status: row.status,
  voteCount: row.vote_count,
  commentCount: row.comment_count,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
  votedByMe,
});

export const rowToSuggestionComment = (
  row: SuggestionCommentRow
): SuggestionComment => ({
  id: row.id,
  suggestionId: row.suggestion_id,
  authorId: row.author_id,
  authorDisplayName: row.author_display_name,
  body: row.body,
  createdAt: new Date(row.created_at).getTime(),
});

/** Sort by most upvoted, then most recent. */
export const sortSuggestions = (items: Suggestion[]): Suggestion[] =>
  [...items].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return b.createdAt - a.createdAt;
  });

const sortComments = (items: SuggestionComment[]): SuggestionComment[] =>
  [...items].sort((a, b) => a.createdAt - b.createdAt);

type LegacyHookResult<T> = [T | undefined, boolean, Error | undefined];

export const useSuggestions = (options?: {
  userId?: string;
  channelId?: string;
}): LegacyHookResult<Suggestion[]> => {
  const userId = options?.userId;
  const instanceId = useId();
  const channelId = options?.channelId ?? instanceId;
  const [suggestions, setSuggestions] = useState<Suggestion[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  // Drop out-of-order responses so an older in-flight refetch cannot
  // overwrite newer vote/status data (Realtime + local notify race).
  const fetchSeq = useRef(0);

  const fetchSuggestions = useCallback(async () => {
    const seq = ++fetchSeq.current;
    const { data, error: fetchError } = await supabase
      .from('suggestions')
      .select('*')
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(SUGGESTIONS_LIMIT);

    if (seq !== fetchSeq.current) return;

    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }

    let votedIds = new Set<string>();
    if (userId) {
      const { data: votes, error: votesError } = await supabase
        .from('suggestion_votes')
        .select('suggestion_id')
        .eq('user_id', userId);
      if (seq !== fetchSeq.current) return;
      if (votesError) {
        setError(votesError);
        setLoading(false);
        return;
      }
      votedIds = new Set((votes ?? []).map((v) => v.suggestion_id));
    }

    if (seq !== fetchSeq.current) return;

    setError(undefined);
    setSuggestions(
      (data ?? []).map((row) => rowToSuggestion(row, votedIds.has(row.id)))
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    fetchSuggestions();

    const onLocalChange = () => fetchSuggestions();
    window.addEventListener(SUGGESTIONS_CHANGED_EVENT, onLocalChange);

    const channel = supabase
      .channel(`suggestions:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suggestions' },
        () => fetchSuggestions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suggestion_votes' },
        () => fetchSuggestions()
      )
      .subscribe();

    return () => {
      window.removeEventListener(SUGGESTIONS_CHANGED_EVENT, onLocalChange);
      supabase.removeChannel(channel);
    };
  }, [channelId, fetchSuggestions]);

  return [suggestions, loading, error];
};

const fetchSuggestion = async (
  suggestionId: string,
  userId?: string
): Promise<Suggestion | null> => {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .eq('id', suggestionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  let votedByMe = false;
  if (userId) {
    const { data: vote, error: voteError } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id')
      .eq('suggestion_id', suggestionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (voteError) throw voteError;
    votedByMe = Boolean(vote);
  }

  return rowToSuggestion(data, votedByMe);
};

const suggestionTopic = (
  suggestionId: string,
  userId?: string
): RealtimeTopic => ({
  key: `suggestion:${suggestionId}:${userId ?? 'anon'}`,
  configure: (channel) => {
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `id=eq.${suggestionId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.suggestion(suggestionId, userId),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestion_votes',
          filter: `suggestion_id=eq.${suggestionId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.suggestion(suggestionId, userId),
          });
        }
      );
  },
  resync: () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.suggestion(suggestionId, userId),
    });
  },
});

export const useSuggestion = (
  suggestionId: string,
  options?: { userId?: string }
): HookResult<Suggestion | null> => {
  const userId = options?.userId;
  const enabled = Boolean(suggestionId);

  const query = useQuery({
    queryKey: queryKeys.suggestion(suggestionId, userId),
    queryFn: () => fetchSuggestion(suggestionId, userId),
    enabled,
  });

  useRealtimeTopic(enabled ? suggestionTopic(suggestionId, userId) : null);

  // Preserve `null` (not found). `asHookResult` collapses null via `??`.
  return [
    query.data === undefined ? undefined : query.data,
    enabled ? query.isPending : false,
    query.data === undefined ? (query.error ?? undefined) : undefined,
  ];
};

const fetchSuggestionComments = async (
  suggestionId: string
): Promise<SuggestionComment[]> => {
  const { data, error } = await supabase
    .from('suggestion_comments')
    .select('*')
    .eq('suggestion_id', suggestionId)
    .order('created_at', { ascending: true })
    .limit(COMMENTS_LIMIT);

  if (error) throw error;
  return sortComments((data ?? []).map(rowToSuggestionComment));
};

const applyCommentInsert = (comment: SuggestionComment): void => {
  const key = queryKeys.suggestionComments(comment.suggestionId);
  const cached = queryClient.getQueryData<SuggestionComment[]>(key);
  if (!cached) return;
  if (cached.some((c) => c.id === comment.id)) return;
  queryClient.setQueryData(key, sortComments([...cached, comment]));
};

const applyCommentDelete = (
  suggestionId: string,
  commentId: string
): void => {
  const key = queryKeys.suggestionComments(suggestionId);
  const cached = queryClient.getQueryData<SuggestionComment[]>(key);
  if (!cached) return;
  queryClient.setQueryData(
    key,
    cached.filter((c) => c.id !== commentId)
  );
};

const suggestionCommentsTopic = (suggestionId: string): RealtimeTopic => ({
  key: `suggestion-comments:${suggestionId}`,
  configure: (channel) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'suggestion_comments',
        filter: `suggestion_id=eq.${suggestionId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as Partial<SuggestionCommentRow> | undefined;
          if (old?.id) applyCommentDelete(suggestionId, old.id);
          return;
        }
        if (payload.new) {
          applyCommentInsert(
            rowToSuggestionComment(payload.new as SuggestionCommentRow)
          );
        }
      }
    );
  },
  resync: () => {
    invalidateSuggestionComments(suggestionId);
  },
});

export const useSuggestionComments = (
  suggestionId: string
): HookResult<SuggestionComment[]> => {
  const enabled = Boolean(suggestionId);

  const query = useQuery({
    queryKey: queryKeys.suggestionComments(suggestionId),
    queryFn: () => fetchSuggestionComments(suggestionId),
    enabled,
  });

  useRealtimeTopic(enabled ? suggestionCommentsTopic(suggestionId) : null);

  return asHookResult(query, enabled);
};

export { retrySuggestion };

export const addSuggestion = async (input: {
  authorId: string;
  authorDisplayName: string | null;
  title: string;
  body: string;
  category: SuggestionCategory;
}): Promise<Suggestion> => {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) {
    throw new Error('Title and suggestion are required');
  }

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      author_id: input.authorId,
      author_display_name: input.authorDisplayName,
      title,
      body,
      category: input.category,
    })
    .select('*')
    .single();

  if (error) throw error;
  notifySuggestionsChanged();
  // Author auto-upvote runs in a DB trigger; treat as voted.
  return rowToSuggestion(data, true);
};

export const addSuggestionComment = async (input: {
  suggestionId: string;
  authorId: string;
  authorDisplayName: string | null;
  body: string;
}): Promise<SuggestionComment> => {
  const body = input.body.trim();
  if (!body) {
    throw new Error('Comment is required');
  }

  const { data, error } = await supabase
    .from('suggestion_comments')
    .insert({
      suggestion_id: input.suggestionId,
      author_id: input.authorId,
      author_display_name: input.authorDisplayName,
      body,
    })
    .select('*')
    .single();

  if (error) throw error;

  const comment = rowToSuggestionComment(data);
  applyCommentInsert(comment);
  // Seed cache when the detail page has not mounted yet.
  const key = queryKeys.suggestionComments(input.suggestionId);
  if (!queryClient.getQueryData(key)) {
    invalidateSuggestionComments(input.suggestionId);
  }
  return comment;
};

export const toggleSuggestionVote = async (
  suggestionId: string,
  userId: string,
  currentlyVoted: boolean
): Promise<void> => {
  if (currentlyVoted) {
    const { error } = await supabase
      .from('suggestion_votes')
      .delete()
      .eq('suggestion_id', suggestionId)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('suggestion_votes').insert({
      suggestion_id: suggestionId,
      user_id: userId,
    });
    if (error) throw error;
  }
  notifySuggestionsChanged();
};

export const updateSuggestionStatus = async (
  suggestionId: string,
  status: SuggestionStatus
): Promise<void> => {
  const { error } = await supabase
    .from('suggestions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', suggestionId);
  if (error) throw error;
  notifySuggestionsChanged();
};

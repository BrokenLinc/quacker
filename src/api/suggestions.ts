import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { supabase } from '@@lib/supabase/client';
import type {
  SuggestionCategory,
  SuggestionRow,
  SuggestionStatus,
} from '@@lib/supabase/types';

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
  createdAt: number;
  updatedAt: number;
  /** True when the signed-in user has an upvote on this suggestion. */
  votedByMe: boolean;
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

const SUGGESTIONS_LIMIT = 500;

const SUGGESTIONS_CHANGED_EVENT = 'quacker:suggestions-changed';

const notifySuggestionsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SUGGESTIONS_CHANGED_EVENT));
  }
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
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
  votedByMe,
});

/** Sort by most upvoted, then most recent. */
export const sortSuggestions = (items: Suggestion[]): Suggestion[] =>
  [...items].sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return b.createdAt - a.createdAt;
  });

type HookResult<T> = [T | undefined, boolean, Error | undefined];

export const useSuggestions = (options?: {
  userId?: string;
  channelId?: string;
}): HookResult<Suggestion[]> => {
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

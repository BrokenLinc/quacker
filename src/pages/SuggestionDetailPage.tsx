import {
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTION_COMMENT_BODY_MAX,
  SUGGESTION_STATUS_LABELS,
  SUGGESTION_STATUSES,
  addSuggestionComment,
  retrySuggestion,
  toggleSuggestionVote,
  updateSuggestionStatus,
  useSuggestion,
  useSuggestionComments,
  type Suggestion,
  type SuggestionComment,
  type SuggestionStatus,
} from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { isSuperAdminPhone, useAuthState } from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import { faArrowLeft, faComment, faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { faThumbsUp as faThumbsUpRegular } from '@fortawesome/free-regular-svg-icons';
import React from 'react';
import { useParams } from 'react-router-dom';

const STATUS_DOT_COLOR: Record<SuggestionStatus, string> = {
  new: 'gray.400',
  under_review: 'orange.400',
  in_development: 'blue.400',
  done: 'green.400',
};

const SuggestionDetailPage: React.FC = () => {
  return (
    <RequireAuth>
      <SuggestionDetailPageInner />
    </RequireAuth>
  );
};
export default SuggestionDetailPage;

const SuggestionDetailPageInner: React.FC = () => {
  const { suggestionId = '' } = useParams<{ suggestionId: string }>();
  const [user] = useAuthState();
  const isSuperAdmin = isSuperAdminPhone(user?.phone);
  const [suggestion, loading, error] = useSuggestion(suggestionId, {
    userId: user?.uid,
  });
  const [comments, commentsLoading, commentsError] =
    useSuggestionComments(suggestionId);

  return (
    <UI.Flex direction="column" flex={1} minH={0} overflow="hidden">
      <UI.HStack
        px={4}
        pt="calc(0.5rem + env(safe-area-inset-top, 0px))"
        pb={2}
        borderBottom="1px solid"
        borderColor="border.subtle"
        flexShrink={0}
        bg="surface.raised"
        spacing={2}
      >
        <UI.IconButton
          as={UI.RouteLink}
          route={routes.suggestions()}
          aria-label="Back to suggestions"
          icon={faArrowLeft}
          size="sm"
          variant="ghost"
        />
        <UI.Heading size="md" flex={1} noOfLines={1}>
          {suggestion?.title ?? 'Suggestion'}
        </UI.Heading>
      </UI.HStack>

      <UI.Box flex={1} minH={0} overflowY="auto" overscrollBehavior="auto">
        <UI.Box
          maxW="640px"
          mx="auto"
          px={4}
          pt={4}
          pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
        >
          {loading ? (
            <UI.VStack align="stretch" spacing={4}>
              <UI.Skeleton h={40} borderRadius="lg" />
              <UI.Skeleton h={24} borderRadius="lg" />
            </UI.VStack>
          ) : error ? (
            <UI.ErrorState
              title="Couldn't load suggestion"
              onRetry={() => retrySuggestion(suggestionId, user?.uid)}
            />
          ) : !suggestion ? (
            <UI.EmptyState
              icon={faComment}
              title="Suggestion not found"
              description="It may have been removed."
              action={
                <UI.RouteButton
                  route={routes.suggestions()}
                  size="md"
                  preset="primary"
                >
                  Back to suggestions
                </UI.RouteButton>
              }
            />
          ) : (
            <UI.VStack align="stretch" spacing={6}>
              <SuggestionDetailCard
                suggestion={suggestion}
                userId={user?.uid}
                isSuperAdmin={isSuperAdmin}
              />
              <CommentsSection
                suggestionId={suggestionId}
                comments={comments}
                loading={commentsLoading}
                error={commentsError}
                userId={user?.uid}
                displayName={user?.displayName ?? null}
              />
            </UI.VStack>
          )}
        </UI.Box>
      </UI.Box>
    </UI.Flex>
  );
};

const SuggestionDetailCard: React.FC<{
  suggestion: Suggestion;
  userId?: string;
  isSuperAdmin: boolean;
}> = ({ suggestion, userId, isSuperAdmin }) => {
  const toast = UI.useToast();
  const [voting, setVoting] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [votedByMe, setVotedByMe] = React.useState(suggestion.votedByMe);
  const [voteCount, setVoteCount] = React.useState(suggestion.voteCount);
  const [status, setStatus] = React.useState(suggestion.status);
  const pendingVotedByMe = React.useRef<boolean | null>(null);
  const pendingStatus = React.useRef<SuggestionStatus | null>(null);

  React.useEffect(() => {
    if (pendingVotedByMe.current !== null) {
      if (suggestion.votedByMe !== pendingVotedByMe.current) return;
      pendingVotedByMe.current = null;
    }
    setVotedByMe(suggestion.votedByMe);
    setVoteCount(suggestion.voteCount);
  }, [suggestion.id, suggestion.votedByMe, suggestion.voteCount]);

  React.useEffect(() => {
    if (pendingStatus.current !== null) {
      if (suggestion.status !== pendingStatus.current) return;
      pendingStatus.current = null;
    }
    setStatus(suggestion.status);
  }, [suggestion.id, suggestion.status]);

  const handleVote = async () => {
    if (!userId || voting) return;
    const wasVoted = votedByMe;
    const nextVoted = !wasVoted;
    pendingVotedByMe.current = nextVoted;
    setVoting(true);
    setVotedByMe(nextVoted);
    setVoteCount((count) => Math.max(0, count + (nextVoted ? 1 : -1)));
    try {
      await toggleSuggestionVote(suggestion.id, userId, wasVoted);
    } catch {
      pendingVotedByMe.current = null;
      setVotedByMe(wasVoted);
      setVoteCount((count) => Math.max(0, count + (nextVoted ? -1 : 1)));
      toast({
        title: "Couldn't update your vote",
        description: 'Check your connection and try again.',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setVoting(false);
    }
  };

  const handleStatusChange = async (next: SuggestionStatus) => {
    if (next === status || statusSaving) return;
    const previous = status;
    pendingStatus.current = next;
    setStatus(next);
    setStatusSaving(true);
    try {
      await updateSuggestionStatus(suggestion.id, next);
    } catch {
      pendingStatus.current = null;
      setStatus(previous);
      toast({
        title: "Couldn't update status",
        description: 'Check your connection and try again.',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <UI.Box
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="xl"
      bg="surface.raised"
      px={4}
      py={4}
      data-testid="suggestion-detail"
    >
      <UI.HStack align="start" spacing={3}>
        <UI.VStack align="stretch" spacing={2} flex={1} minW={0}>
          <UI.HStack spacing={2} flexWrap="wrap">
            <UI.Box
              as="span"
              w={2}
              h={2}
              borderRadius="full"
              bg={STATUS_DOT_COLOR[status]}
              flexShrink={0}
              aria-hidden
            />
            {isSuperAdmin ? (
              <UI.Select
                size="xs"
                maxW="160px"
                value={status}
                isDisabled={statusSaving}
                aria-label="Suggestion status"
                onChange={(e) =>
                  handleStatusChange(e.target.value as SuggestionStatus)
                }
              >
                {SUGGESTION_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {SUGGESTION_STATUS_LABELS[option]}
                  </option>
                ))}
              </UI.Select>
            ) : (
              <UI.Text fontSize="xs" color="text.muted">
                {SUGGESTION_STATUS_LABELS[status]}
              </UI.Text>
            )}
            <UI.Text fontSize="xs" color="text.muted">
              {SUGGESTION_CATEGORY_LABELS[suggestion.category]}
            </UI.Text>
          </UI.HStack>
          <UI.Heading as="h2" size="md">
            {suggestion.title}
          </UI.Heading>
          <UI.Text fontSize="md" whiteSpace="pre-wrap">
            {suggestion.body}
          </UI.Text>
          {suggestion.authorDisplayName ? (
            <UI.Text fontSize="xs" color="text.muted">
              {suggestion.authorDisplayName}
            </UI.Text>
          ) : null}
        </UI.VStack>
        <UI.VStack spacing={0} flexShrink={0}>
          <UI.IconButton
            aria-label={votedByMe ? 'Remove upvote' : 'Upvote suggestion'}
            icon={votedByMe ? faThumbsUp : faThumbsUpRegular}
            size="sm"
            variant={votedByMe ? 'solid' : 'ghost'}
            colorScheme={votedByMe ? 'teal' : undefined}
            onClick={handleVote}
            isLoading={voting}
            isDisabled={!userId}
          />
          <UI.Text fontSize="sm" fontWeight="medium" aria-label="Vote count">
            {voteCount}
          </UI.Text>
        </UI.VStack>
      </UI.HStack>
    </UI.Box>
  );
};

const CommentsSection: React.FC<{
  suggestionId: string;
  comments: SuggestionComment[] | undefined;
  loading: boolean;
  error: Error | undefined;
  userId?: string;
  displayName: string | null;
}> = ({
  suggestionId,
  comments,
  loading,
  error,
  userId,
  displayName,
}) => {
  const toast = UI.useToast();
  const [body, setBody] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const canSubmit =
    Boolean(body.trim()) && !saving && Boolean(userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !canSubmit) return;
    setSaving(true);
    try {
      await addSuggestionComment({
        suggestionId,
        authorId: userId,
        authorDisplayName: displayName,
        body,
      });
      setBody('');
    } catch {
      toast({
        title: "Couldn't post comment",
        description: 'Check your connection and try again.',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <UI.VStack align="stretch" spacing={4} data-testid="suggestion-comments">
      <UI.Heading as="h3" size="sm">
        Comments
      </UI.Heading>

      {loading ? (
        <UI.VStack align="stretch" spacing={3}>
          <UI.Skeleton h={16} borderRadius="lg" />
          <UI.Skeleton h={16} borderRadius="lg" />
        </UI.VStack>
      ) : error ? (
        <UI.ErrorState
          title="Couldn't load comments"
          onRetry={() => retrySuggestion(suggestionId, userId)}
        />
      ) : !comments?.length ? (
        <UI.Text fontSize="sm" color="text.muted">
          No comments yet. Be the first to reply.
        </UI.Text>
      ) : (
        <UI.VStack align="stretch" spacing={3}>
          {comments.map((comment) => (
            <UI.Box
              key={comment.id}
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="lg"
              bg="surface.raised"
              px={3}
              py={3}
              data-testid="suggestion-comment"
            >
              <UI.Text fontSize="sm" whiteSpace="pre-wrap">
                {comment.body}
              </UI.Text>
              {comment.authorDisplayName ? (
                <UI.Text fontSize="xs" color="text.muted" mt={2}>
                  {comment.authorDisplayName}
                </UI.Text>
              ) : null}
            </UI.Box>
          ))}
        </UI.VStack>
      )}

      <UI.Box
        as="form"
        onSubmit={handleSubmit}
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="lg"
        bg="surface.raised"
        px={3}
        py={3}
      >
        <UI.FormControl>
          <UI.Textarea
            value={body}
            onChange={(e) =>
              setBody(e.target.value.slice(0, SUGGESTION_COMMENT_BODY_MAX))
            }
            maxLength={SUGGESTION_COMMENT_BODY_MAX}
            placeholder="Write a reply…"
            rows={3}
            aria-label="Write a reply"
            data-testid="suggestion-comment-input"
          />
          <UI.HStack justify="space-between" mt={2}>
            <UI.Text fontSize="xs" color="text.muted">
              {body.length}/{SUGGESTION_COMMENT_BODY_MAX}
            </UI.Text>
            <UI.Button
              type="submit"
              size="sm"
              preset="primary"
              isLoading={saving}
              isDisabled={!canSubmit}
              data-testid="suggestion-comment-submit"
            >
              Reply
            </UI.Button>
          </UI.HStack>
        </UI.FormControl>
      </UI.Box>
    </UI.VStack>
  );
};

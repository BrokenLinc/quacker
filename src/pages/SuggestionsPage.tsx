import {
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTION_STATUS_LABELS,
  SUGGESTION_STATUSES,
  toggleSuggestionVote,
  updateSuggestionStatus,
  useSuggestions,
  type Suggestion,
  type SuggestionStatus,
} from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { UserMenu } from '@@components/UserMenu';
import { filterSuggestions } from '@@lib/suggestions/filterSuggestions';
import { isSuperAdminPhone, useAuthState } from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import {
  faArrowLeft,
  faLightbulb,
  faPlus,
  faSearch,
  faThumbsUp,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComment,
  faThumbsUp as faThumbsUpRegular,
} from '@fortawesome/free-regular-svg-icons';
import React from 'react';

const STATUS_DOT_COLOR: Record<SuggestionStatus, string> = {
  new: 'gray.400',
  under_review: 'orange.400',
  in_development: 'blue.400',
  done: 'green.400',
};

const SuggestionsPage: React.FC = () => {
  return (
    <RequireAuth>
      <SuggestionsPageInner />
    </RequireAuth>
  );
};
export default SuggestionsPage;

const SuggestionsPageInner: React.FC = () => {
  const [user] = useAuthState();
  const [suggestions, loading, error] = useSuggestions({
    userId: user?.uid,
    channelId: 'suggestions-page',
  });
  const [query, setQuery] = React.useState('');
  const [mineOnly, setMineOnly] = React.useState(false);
  const isSuperAdmin = isSuperAdminPhone(user?.phone);

  const filtered = filterSuggestions(suggestions ?? [], {
    query,
    mineOnly,
    userId: user?.uid,
  });
  const hasSuggestions = (suggestions ?? []).length > 0;
  const isMobile = UI.useBreakpointValue({ base: true, md: false }) ?? false;

  const searchAndFilter = (
    <UI.HStack mb={4} spacing={3} align="center">
      <UI.InputGroup flex={1}>
        <UI.InputLeftElement pointerEvents="none">
          <FontAwesomeIcon icon={faSearch} />
        </UI.InputLeftElement>
        <UI.Input
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search"
          pl={10}
        />
      </UI.InputGroup>
      <UI.FormControl display="flex" alignItems="center" w="auto">
        <UI.FormLabel htmlFor="mine-only" mb={0} mr={2} fontSize="sm">
          Mine
        </UI.FormLabel>
        <UI.Switch
          id="mine-only"
          isChecked={mineOnly}
          onChange={(e) => setMineOnly(e.target.checked)}
        />
      </UI.FormControl>
    </UI.HStack>
  );

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
          route={routes.home()}
          aria-label="Back to home"
          icon={faArrowLeft}
          size="sm"
          variant="ghost"
        />
        <UI.Heading size="md" flex={1} noOfLines={1}>
          Suggestions
        </UI.Heading>
        {isMobile ? <UserMenu showColorMode /> : null}
      </UI.HStack>

      <UI.Box flex={1} minH={0} overflowY="auto" overscrollBehavior="auto">
        <UI.Box
          maxW="640px"
          mx="auto"
          px={4}
          pt={4}
          pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
        >
          {hasSuggestions ? (
            <UI.Box mb={3}>
              <UI.RouteButton
                route={routes.suggestionsNew()}
                size="sm"
                preset="primary"
                iconBefore={faPlus}
                data-testid="make-suggestion"
              >
                Make a suggestion
              </UI.RouteButton>
            </UI.Box>
          ) : null}

          {hasSuggestions ? searchAndFilter : null}

          {loading ? (
            <UI.VStack align="stretch" spacing={3}>
              <UI.Skeleton h={24} borderRadius="lg" />
              <UI.Skeleton h={24} borderRadius="lg" />
              <UI.Skeleton h={24} borderRadius="lg" />
            </UI.VStack>
          ) : error ? (
            <UI.ErrorState
              title="Couldn't load suggestions"
              onRetry={() => window.location.reload()}
            />
          ) : !filtered.length ? (
            <UI.EmptyState
              icon={faLightbulb}
              title={
                query.trim() || mineOnly
                  ? 'No matching suggestions'
                  : 'No suggestions yet'
              }
              description={
                query.trim() || mineOnly
                  ? 'Try a different search or turn off Mine.'
                  : 'Share an idea or upvote others.'
              }
              action={
                !query.trim() && !mineOnly ? (
                  <UI.RouteButton
                    route={routes.suggestionsNew()}
                    size="md"
                    preset="primary"
                    iconBefore={faPlus}
                    data-testid="make-suggestion"
                  >
                    Make a suggestion
                  </UI.RouteButton>
                ) : undefined
              }
            />
          ) : (
            <UI.VStack align="stretch" spacing={3}>
              {filtered.map((suggestion) => (
                <SuggestionRow
                  key={suggestion.id}
                  suggestion={suggestion}
                  userId={user?.uid}
                  isSuperAdmin={isSuperAdmin}
                />
              ))}
            </UI.VStack>
          )}
        </UI.Box>
      </UI.Box>
    </UI.Flex>
  );
};

const SuggestionRow: React.FC<{
  suggestion: Suggestion;
  userId?: string;
  isSuperAdmin: boolean;
}> = ({ suggestion, userId, isSuperAdmin }) => {
  const toast = UI.useToast();
  const [voting, setVoting] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);
  // Optimistic vote UI — parent `votedByMe` lags until refetch completes.
  const [votedByMe, setVotedByMe] = React.useState(suggestion.votedByMe);
  const [voteCount, setVoteCount] = React.useState(suggestion.voteCount);
  // Optimistic status — avoid select snapping back before list refetch.
  const [status, setStatus] = React.useState(suggestion.status);
  // Ignore stale parent props until the list reflects our last mutation.
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
      position="relative"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="xl"
      bg="surface.raised"
      px={4}
      py={3}
      data-testid="suggestion-row"
    >
      <UI.HStack align="start" spacing={3} position="relative" zIndex={1}>
        <UI.VStack align="stretch" spacing={1} flex={1} minW={0}>
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
                pointerEvents="auto"
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
          <UI.Text fontWeight="semibold">{suggestion.title}</UI.Text>
          <UI.Text fontSize="sm" color="text.muted" noOfLines={2}>
            {suggestion.body}
          </UI.Text>
          <UI.RouteLink
            route={routes.suggestion(suggestion.id)}
            fontSize="xs"
            color="text.muted"
          >
            Read more &amp; reply
          </UI.RouteLink>
        </UI.VStack>
        <UI.VStack spacing={4} flexShrink={0}>
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
          {suggestion.commentCount > 0 ? (
            <UI.VStack spacing={0} flexShrink={0}>
              <UI.Box py={0.5}>
                <UI.Icon icon={faComment} size="sm" />
              </UI.Box>
              <UI.Text
                fontSize="xs"
                color="text.muted"
                aria-label="Comment count"
                data-testid="suggestion-comment-count"
              >
                {suggestion.commentCount}
              </UI.Text>
            </UI.VStack>
          ) : null}
        </UI.VStack>
      </UI.HStack>
    </UI.Box>
  );
};

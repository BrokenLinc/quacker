import {
  addSuggestion,
  type SuggestionCategory,
} from '@@api';
import { RequireAuth } from '@@components/auth/RequireAuth';
import { useAuthState } from '@@lib/supabase/auth';
import { routes } from '@@routing/routes';
import * as UI from '@@ui';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const TITLE_MAX = 80;
const BODY_MAX = 2000;

const CATEGORY_OPTIONS: {
  value: SuggestionCategory;
  label: string;
}[] = [
  { value: 'feature_request', label: 'Feature request' },
  { value: 'bug_report', label: 'Bug report' },
  { value: 'other', label: 'Other' },
];

const NewSuggestionPage: React.FC = () => {
  return (
    <RequireAuth>
      <NewSuggestionPageInner />
    </RequireAuth>
  );
};
export default NewSuggestionPage;

const NewSuggestionPageInner: React.FC = () => {
  const [user] = useAuthState();
  const navigate = useNavigate();
  const toast = UI.useToast();
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [category, setCategory] =
    React.useState<SuggestionCategory>('feature_request');
  const [saving, setSaving] = React.useState(false);

  const canSubmit =
    Boolean(title.trim()) && Boolean(body.trim()) && !saving && Boolean(user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setSaving(true);
    try {
      await addSuggestion({
        authorId: user.uid,
        authorDisplayName: user.displayName,
        title,
        body,
        category,
      });
      navigate(routes.suggestions().path);
    } catch {
      toast({
        title: "Couldn't submit suggestion",
        description: 'Check your connection and try again.',
        status: 'error',
        duration: 4000,
      });
      setSaving(false);
    }
  };

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
          Make a suggestion
        </UI.Heading>
      </UI.HStack>

      <UI.Box
        flex={1}
        minH={0}
        overflowY="auto"
        overscrollBehavior="auto"
      >
        <UI.Box
          as="form"
          onSubmit={handleSubmit}
          maxW="560px"
          mx="auto"
          px={4}
          pt={4}
          pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
        >
          <UI.VStack align="stretch" spacing={4}>
            <UI.FormControl isRequired>
              <UI.FormLabel>Title</UI.FormLabel>
              <UI.Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                maxLength={TITLE_MAX}
                placeholder="Short summary"
                autoComplete="off"
              />
              <UI.FormHelperText textAlign="right">
                {title.length}/{TITLE_MAX}
              </UI.FormHelperText>
            </UI.FormControl>

            <UI.FormControl isRequired>
              <UI.FormLabel>Suggestion</UI.FormLabel>
              <UI.Textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                maxLength={BODY_MAX}
                placeholder="What would you like to see?"
                rows={6}
              />
              <UI.FormHelperText textAlign="right">
                {body.length}/{BODY_MAX}
              </UI.FormHelperText>
            </UI.FormControl>

            <UI.FormControl as="fieldset">
              <UI.FormLabel as="legend">Category</UI.FormLabel>
              <UI.RadioWithOptions
                name="category"
                value={category}
                onChange={(value) =>
                  setCategory(value as SuggestionCategory)
                }
                options={CATEGORY_OPTIONS}
                direction="vertical"
              />
            </UI.FormControl>

            <UI.Button
              type="submit"
              preset="primary"
              isLoading={saving}
              isDisabled={!canSubmit}
              alignSelf="flex-start"
            >
              Submit suggestion
            </UI.Button>
          </UI.VStack>
        </UI.Box>
      </UI.Box>
    </UI.Flex>
  );
};

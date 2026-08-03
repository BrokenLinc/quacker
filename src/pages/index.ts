import React from 'react';

export const HomePage = React.lazy(() => import('./HomePage'));
export const SuggestionsPage = React.lazy(() => import('./SuggestionsPage'));
export const NewSuggestionPage = React.lazy(
  () => import('./NewSuggestionPage')
);
export const GroupPage = React.lazy(() => import('./GroupPage'));
export const GroupSlugPage = React.lazy(() => import('./GroupSlugPage'));
export const NotFoundPage = React.lazy(() => import('./NotFoundPage'));

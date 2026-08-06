import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom';
import React from 'react';

import { AppLayout } from '@@components/AppShell';
import * as Pages from '@@pages';

import { getRouteIdFromPaths } from './helpers/routeId';
import { routes } from './routes';

const RouteError: React.FC = () => {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error';

  // Plain HTML on purpose: this can render when the app shell itself fails.
  return (
    <div
      style={{
        padding: '4rem 2rem',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        maxWidth: '420px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '1.25rem' }}>Something went wrong</h1>
      <p style={{ opacity: 0.8 }}>
        Sorry about that — reloading usually fixes it.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          padding: '0.5rem 1.25rem',
          borderRadius: '0.5rem',
          border: '1px solid #ccc',
          cursor: 'pointer',
        }}
      >
        Reload
      </button>
      <pre
        style={{
          fontSize: '0.75rem',
          opacity: 0.5,
          whiteSpace: 'pre-wrap',
          marginTop: '2rem',
        }}
      >
        {message}
      </pre>
    </div>
  );
};

const withSuspense = (Component: React.ComponentType) => (
  <React.Suspense fallback={<div data-testid="route-loading" />}>
    <Component />
  </React.Suspense>
);

const router = createBrowserRouter([
  {
    id: 'app-shell',
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      {
        id: getRouteIdFromPaths({ path: routes.home().path }),
        path: routes.home().path,
        element: withSuspense(Pages.HomePage),
      },
      {
        id: getRouteIdFromPaths({ path: routes.suggestionsNew().path }),
        path: routes.suggestionsNew().path,
        element: withSuspense(Pages.NewSuggestionPage),
      },
      {
        id: getRouteIdFromPaths({ path: routes.suggestion().path }),
        path: routes.suggestion().path,
        element: withSuspense(Pages.SuggestionDetailPage),
      },
      {
        id: getRouteIdFromPaths({ path: routes.suggestions().path }),
        path: routes.suggestions().path,
        element: withSuspense(Pages.SuggestionsPage),
      },
      {
        id: getRouteIdFromPaths({ path: routes.groupBySlug().path }),
        path: routes.groupBySlug().path,
        element: withSuspense(Pages.GroupSlugPage),
      },
      {
        id: getRouteIdFromPaths({ path: routes.group().path }),
        path: routes.group().path,
        element: withSuspense(Pages.GroupPage),
      },
      {
        id: 'not-found',
        path: '*',
        element: withSuspense(Pages.NotFoundPage),
      },
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};

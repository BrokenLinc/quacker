import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom';
import React from 'react';

import { AppShell } from '@@components/AppShell';
import { RequireAuth } from '@@components/auth/RequireAuth';
import * as Pages from '@@pages';

const RouteError: React.FC = () => {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unknown error';

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Something went wrong</h1>
      <p>
        The page failed to load. Try a hard refresh (Cmd+Shift+R). During
        development, restarting the Vite dev server also helps.
      </p>
      <pre style={{ fontSize: '0.85rem', opacity: 0.8 }}>{message}</pre>
      <button type="button" onClick={() => window.location.reload()}>
        Reload page
      </button>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <React.Suspense fallback={<div data-testid="route-loading" />}>
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      </React.Suspense>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <React.Suspense fallback={<div data-testid="route-loading" />}>
            <Pages.HomePage />
          </React.Suspense>
        ),
      },
      {
        path: 'g/:slug',
        element: (
          <React.Suspense fallback={<div data-testid="route-loading" />}>
            <Pages.GroupSlugPage />
          </React.Suspense>
        ),
      },
      {
        path: ':groupId',
        element: (
          <React.Suspense fallback={<div data-testid="route-loading" />}>
            <Pages.GroupPage />
          </React.Suspense>
        ),
      },
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};

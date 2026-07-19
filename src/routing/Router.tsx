import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom';
import _ from 'lodash';
import React from 'react';

import * as Pages from '@@pages';

import { getRouteIdFromPaths } from './helpers/routeId';
import { routes } from './routes';
import { AppRoute } from './types';

const appRoutes: AppRoute[] = [
  { ...routes.home(), component: Pages.HomePage },
  { ...routes.group(), component: Pages.GroupPage },
  { ...routes.groupBySlug(), component: Pages.GroupSlugPage },
  { ...routes.authCallback(), component: Pages.AuthCallbackPage },
];

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

const router = createBrowserRouter(
  _.map(appRoutes, (route) => ({
    id: getRouteIdFromPaths({
      path: route.path,
    }),
    path: route.path,
    element: (
      <React.Suspense fallback={<div data-testid="route-loading" />}>
        <route.component />
      </React.Suspense>
    ),
    errorElement: <RouteError />,
  }))
);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import { getRouteIdFromPaths } from './helpers/routeId';
import _ from 'lodash';
import React from 'react';

const router = createBrowserRouter(
  _.map(routes, (routeFn) => {
    const route = routeFn();
    return {
      id: getRouteIdFromPaths({
        path: route.path,
      }),
      path: route.path,
      element: (
        <React.Suspense>
          <route.component />
        </React.Suspense>
      ),
    };
  })
);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};

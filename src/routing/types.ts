import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type AppRoute = {
  parent?: AppRoute;
  path: string;
  component: React.LazyExoticComponent<React.FC>;
  label: string;
  icon?: IconDefinition;
};

export type ModalRoute = {
  parent: AppRoute;
  subPath: string;
  label: string;
  icon?: IconDefinition;
};

export type AppRouteFn = () => AppRoute;

export type AppRouteTree = AppRouteFn | AppRoutes;
export type AppRoutes = {
  [key: string]: AppRouteTree;
};

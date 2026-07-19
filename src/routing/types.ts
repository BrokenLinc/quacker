import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type RouteDef = {
  parent?: RouteDef;
  path: string;
  label: string;
  icon?: IconDefinition;
};

export type AppRoute = RouteDef & {
  component: React.LazyExoticComponent<React.FC>;
};

export type ModalRoute = {
  parent: RouteDef;
  subPath: string;
  label: string;
  icon?: IconDefinition;
};

export type RouteDefFn = () => RouteDef;
export type AppRouteFn = () => AppRoute;

export type AppRouteTree = AppRouteFn | AppRoutes;
export type AppRoutes = {
  [key: string]: AppRouteTree;
};

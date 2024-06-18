import _ from 'lodash';
import { AppRoute, AppRouteTree } from '../types';

/**
 * Takes a route tree and returns a flat array of generated routes (with default params).
 */
export const getRoutesFromTree = (routeTree: AppRouteTree): AppRoute[] => {
  if (typeof routeTree === 'function') {
    return [routeTree()];
  }

  return _.flatMap(routeTree, getRoutesFromTree);
};

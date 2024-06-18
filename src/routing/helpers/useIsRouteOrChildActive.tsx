import { AppRoute } from '@@routing/types';
import _ from 'lodash';
import { useMatch, useMatches } from 'react-router-dom';
import { getRoutePathsFromId } from './routeId';

export const useIsRouteOrChildActive = (
  route: AppRoute,
  activateOnChild?: boolean
) => {
  const isActive = useMatch(route.path);

  // Get current route's parent path.
  const matches = useMatches();
  const { parentPath } = getRoutePathsFromId(_.last(matches)?.id);

  // Return if the current is a child of the specified route.
  const isChildActive = route.path === parentPath;

  return isActive || (activateOnChild && isChildActive);
};

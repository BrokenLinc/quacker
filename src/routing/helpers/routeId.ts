import _ from 'lodash';

// Creates a route id in the format "path|parentPath"
export const getRouteIdFromPaths = ({
  path,
  parentPath,
}: {
  path: string;
  parentPath?: string;
}) => {
  return _.compact([path, parentPath]).join('|');
};

// Parses a route id in the format "path|parentPath" into an object
export const getRoutePathsFromId = (routeId?: string) => {
  const [path, parentPath] = routeId?.split('|') || [];
  return {
    path,
    parentPath,
  };
};

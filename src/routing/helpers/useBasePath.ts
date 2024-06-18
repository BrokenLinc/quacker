import _ from 'lodash';
import { useLocation } from 'react-router-dom';

// Use the "base path", by stripping out any modal routes
// Strip slashes so that the optional trailing slash is not treated as unique
const getModalBasePath = (pathname: string) =>
  _.trim(pathname.split('/modal/')[0], '/');

export const useBasePath = () => {
  return getModalBasePath(useLocation().pathname);
};

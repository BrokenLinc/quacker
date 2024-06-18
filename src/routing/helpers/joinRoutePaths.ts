import _ from 'lodash';

/**
  Gets the base path and querystring of two path, and joins them together.
  The result is the combined base path strings, and the combined querystring, if there is one.
  Note that either querystring may be empty, or may contain a leading '?'.
  If both query-strings are present, they will need to be joined with an ampersand.
  */
export const joinRoutePaths = (
  pathAndOptionalQuerystring1: string,
  pathAndOptionalQuerystring2: string
) => {
  const [path1, querystring1] = pathAndOptionalQuerystring1.split('?');
  const [path2, querystring2] = pathAndOptionalQuerystring2.split('?');
  const basePath = path1 + path2;
  const querystring = _.compact([querystring1, querystring2]).join('&');
  return basePath + (querystring ? '?' + querystring : '');
};

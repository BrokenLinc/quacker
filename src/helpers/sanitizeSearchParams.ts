import _ from 'lodash';

const defaultParams = {
  pagination: {
    pageIndex: 1,
    pageSize: 10,
  },
};

export function sanitizeSearchParams<T extends object>(
  params: T | undefined
): T {
  return _.merge({}, defaultParams, params);
}

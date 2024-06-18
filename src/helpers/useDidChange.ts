import _ from 'lodash';
import { usePrevious } from 'react-use';

type UseDidChangeOptions = {
  ignoreChangeFromNil?: boolean;
  ignoreChangeToNil?: boolean;
};

export const useDidChange = (value: any, options?: UseDidChangeOptions) => {
  const previousValue = usePrevious(value);
  if (options?.ignoreChangeFromNil) {
    return !_.isNil(previousValue) && value !== previousValue;
  }
  if (options?.ignoreChangeToNil) {
    return !_.isNil(value) && value !== previousValue;
  }
  return value !== previousValue;
};

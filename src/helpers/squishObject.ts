import _ from 'lodash';

// Flatten an object, and remove any keys with null or undefined values.
export const squishObject = (obj: { [key: string]: any } = {}, prefix = '') => {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (_.isNil(obj[k])) {
      return acc;
    }
    if (_.isPlainObject(obj[k])) {
      const nestedObject = squishObject(obj[k], pre + k);
      if (!_.isEmpty(nestedObject)) {
        Object.assign(acc, nestedObject);
      }
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {} as { [key: string]: any });
};

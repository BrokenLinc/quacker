import _ from 'lodash';

export const isDateFieldName = (field: string) => {
  // if it's a "date only" field, skip
  if (field.endsWith('DateOnly')) return false;

  // the field is a date if it ends with 'Date' or 'At'
  if (
    field.endsWith('DateTimeUtc') ||
    field.endsWith('At') ||
    field.startsWith('date') // TODO: remove this when the API is fixed
  )
    return true;

  return false;
};

// Recursively transform ISO strings to dates in an object
export const convertDateStringsToDates = (data: any): any => {
  // Recur on lists of values
  if (_.isArray(data)) {
    return data.map(convertDateStringsToDates);
  }
  // Iterate through members of object
  if (_.isObject(data)) {
    return _.mapValues(data, (value: any, fieldName: string) => {
      // Transform ISO strings to dates
      if (isDateFieldName(fieldName)) {
        return value ? new Date(value) : null;
      }
      // Recur on nested values
      return convertDateStringsToDates(value);
    });
  }
  return data;
};

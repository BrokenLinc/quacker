import { format } from 'date-fns';
import _ from 'lodash';

export const monthOptionsZeroIndex = _.times(12, (i) => ({
  value: i,
  label: format(new Date(2020, i, 1), 'MMM'),
}));

export const monthOptionsOneIndex = _.times(12, (i) => ({
  value: i + 1,
  label: format(new Date(2020, i, 1), 'MMM'),
}));

export const dayOptions = _.times(31, (i) => ({
  value: i + 1,
  label: i + 1,
}));

export const hourOptions = _.times(12, (i) => ({
  value: `${i + 1}`,
  label: `${i + 1}`,
}));

export const minuteOptions = _.times(60, (i) => ({
  value: _.padStart(`${i}`, 2, '0'),
  label: _.padStart(`${i}`, 2, '0'),
}));

export const amPmOptions = _.map(['AM', 'PM'], (i) => {
  return {
    value: i,
    label: i,
  };
});

const startYear = 1900;
const thisYear = new Date().getFullYear();
const numYears = thisYear - startYear + 2; // Include current year and next year
export const yearOptions = _.times(numYears, (i) => ({
  value: thisYear - i + 1,
  label: thisYear - i + 1,
}));

export const monthOptionsCC = _.times(12, (i) => ({
  value: i + 1,
  label: `${i + 1}`.padStart(2, '0'),
}));

export const yearOptionsCC = _.times(11, (i) => ({
  value: thisYear + i,
  label: thisYear + i,
})).reverse();

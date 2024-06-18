import { format } from 'date-fns';
import { DATE_ONLY_FORMAT, DATE_ONLY_SYNTAX } from './dateOnlyHelpers';
import { TIME_ONLY_FORMAT, TIME_ONLY_SYNTAX } from './timeOnlyHelpers';

export const DATE_TIME_ONLY_SYNTAX = `${DATE_ONLY_SYNTAX} ${TIME_ONLY_SYNTAX}`;
export const DATE_TIME_ONLY_FORMAT = `${DATE_ONLY_FORMAT} ${TIME_ONLY_FORMAT}`;

export const convertDateTimeOnlyToJSDate = (value: string) => {
  return new Date(value);
};

export const formatDateTimeOnly = (value: string) => {
  if (!value) return '';
  return format(
    convertDateTimeOnlyToJSDate(value),
    DATE_TIME_ONLY_FORMAT
  ).toLowerCase();
};

export const getTimeOnlyFromDateTimeOnly = (value: string) => {
  if (!value) return '';
  return format(
    convertDateTimeOnlyToJSDate(value),
    TIME_ONLY_SYNTAX
  ).toLowerCase();
};

export const getDateOnlyFromDateTimeOnly = (value: string) => {
  if (!value) return '';
  return format(
    convertDateTimeOnlyToJSDate(value),
    DATE_ONLY_SYNTAX
  ).toLowerCase();
};

export const getDateTimeOnlyFromDate = (value: Date) => {
  return format(value, DATE_TIME_ONLY_SYNTAX);
};

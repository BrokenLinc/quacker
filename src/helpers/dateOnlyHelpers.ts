import { format } from 'date-fns';
import { DateTime } from 'luxon';
import {
  getPreviousDateTime,
  isDateTimeBeforeYesterday,
} from './dateTimeHelpers';

export const DATE_ONLY_SYNTAX = 'yyyy-MM-dd';
export const DATE_ONLY_FORMAT = 'MM/dd/yyyy';

export const convertDateOnlyToJSDate = (value: string) => {
  return DateTime.fromISO(value).toJSDate();
};

export const formatDateOnly = (value: string | null | undefined) => {
  if (!value) return '';
  return format(convertDateOnlyToJSDate(value), DATE_ONLY_FORMAT);
};

export const formatDateOnlyAbbr = (value: string | null | undefined) => {
  if (!value) return '';
  return format(convertDateOnlyToJSDate(value), 'MMM d');
};

export const getDateOnlyFromDate = (value: Date) => {
  return format(value, DATE_ONLY_SYNTAX);
};

export const getPreviousDateOnly = (value: string) => {
  return getDateOnlyFromDate(
    getPreviousDateTime(convertDateOnlyToJSDate(value))
  );
};

export const isDateOnlyBeforeYesterday = (value?: string | null) => {
  if (!value) return false;
  return isDateTimeBeforeYesterday(convertDateOnlyToJSDate(value));
};

export const isDateOnlyAnniversaryToday = (value?: string | null) => {
  if (!value) return false;
  const today = format(new Date(), 'MM-dd');
  const birthday = value?.split('-').slice(1).join('-'); // MM-dd
  return today === birthday;
};

import { format, parse } from 'date-fns';

export const TIME_ONLY_SYNTAX = 'HH:mm:ss';
export const TIME_ONLY_FORMAT = 'h:mma';

export const formatTimeOnly = (value: string) => {
  if (!value) return '';

  // Trim milliseconds, which are sometimes present in various lengths
  const valueWithoutMs = value.split('.')[0];

  try {
    return format(
      parse(valueWithoutMs, TIME_ONLY_SYNTAX, new Date()),
      TIME_ONLY_FORMAT
    ).toLowerCase();
  } catch (e) {
    return '';
  }
};

export const getTimeOnlyFromDate = (value: Date) => {
  return format(value, TIME_ONLY_SYNTAX);
};

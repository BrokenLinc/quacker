import { convertDateOnlyToJSDate } from '@@helpers/dateOnlyHelpers';
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  startOfDay,
} from 'date-fns';

export const getAgeLabel = (dateOfBirthDateOnly: string | null | undefined) => {
  if (!dateOfBirthDateOnly) return '—';

  const startOfToday = startOfDay(Date.now());

  const years = differenceInYears(
    startOfToday,
    convertDateOnlyToJSDate(dateOfBirthDateOnly)
  );
  const months = differenceInMonths(
    startOfToday,
    convertDateOnlyToJSDate(dateOfBirthDateOnly)
  );
  const days = differenceInDays(
    startOfToday,
    convertDateOnlyToJSDate(dateOfBirthDateOnly)
  );

  if (years > 0) return `${years} ${years > 1 ? 'years' : 'year'}`;
  if (months > 0) return `${months} ${months > 1 ? 'months' : 'month'}`;
  if (days > 0) return `${days} ${days > 1 ? 'days' : 'day'}`;
  return '—';
};

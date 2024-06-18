import { convertDateOnlyToJSDate } from '@@helpers/dateOnlyHelpers';
import { differenceInYears, startOfDay } from 'date-fns';

export const getAgeInYears = (
  dateOfBirthDateOnly: string | null | undefined
): number | undefined => {
  if (!dateOfBirthDateOnly) return;

  const startOfToday = startOfDay(Date.now());
  const years = differenceInYears(
    startOfToday,
    convertDateOnlyToJSDate(dateOfBirthDateOnly)
  );

  return years;
};

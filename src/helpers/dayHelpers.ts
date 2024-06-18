import _ from 'lodash';

export type DayName =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const daysOfTheWeek: { name: DayName; label: string }[] = [
  { name: 'monday', label: 'M' },
  { name: 'tuesday', label: 'Tu' },
  { name: 'wednesday', label: 'W' },
  { name: 'thursday', label: 'Th' },
  { name: 'friday', label: 'F' },
  { name: 'saturday', label: 'Sa' },
  { name: 'sunday', label: 'Su' },
];

export const getDayAbbreviations = (days: {
  monday?: boolean | null;
  tuesday?: boolean | null;
  wednesday?: boolean | null;
  thursday?: boolean | null;
  friday?: boolean | null;
  saturday?: boolean | null;
  sunday?: boolean | null;
}) => {
  return _.compact(
    daysOfTheWeek.map((day) => {
      return days[day.name] ? day.label : null;
    })
  ).join(' ');
};

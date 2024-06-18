import {
  dayOptions,
  monthOptionsZeroIndex,
  yearOptions,
} from '@@helpers/dateOptions';
import * as UI from '@@ui';
import _ from 'lodash';
import React from 'react';
import { usePrevious } from 'react-use';

const coerceDatePart = (value: string) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? undefined : parsed;
};

const getYear = (value: string | null | undefined) => {
  if (!value) return undefined;
  return parseInt(value.split('-')[0]);
};
const getMonth = (value: string | null | undefined) => {
  if (!value) return undefined;
  return parseInt(value.split('-')[1]) - 1;
};
const getDay = (value: string | null | undefined) => {
  if (!value) return undefined;
  return parseInt(value.split('-')[2]);
};

export type DateOnlyPartsInputProps = Omit<
  UI.SelectProps,
  'value' | 'onChange'
> & {
  value?: string | null;
  onChange?: (date: string | null) => any;
};
/**
 * A component that renders a date input as three select boxes (month, day, year),
 * The input value, and onChange value is a date object.
 * The component is "timeless" in that it does not include a time component.
 * The component has its own internal state, so that the user can adjust individual the select boxes without the select boxes resetting.
 */
export const DateOnlyPartsInput: React.FC<DateOnlyPartsInputProps> = (
  props
) => {
  const { value, onChange, ...rest } = props;
  const didValueChange = value !== usePrevious(value);
  const [month, setMonth] = React.useState(getMonth(value));
  const [day, setDay] = React.useState(getDay(value));
  const [year, setYear] = React.useState(getYear(value));

  // If value is changed externally, update internal state
  React.useEffect(() => {
    if (value && didValueChange) {
      setMonth(getMonth(value));
      setDay(getDay(value));
      setYear(getYear(value));
    }
  }, [value, didValueChange]);

  const handleDateChange = (
    month: number | undefined,
    day: number | undefined,
    year: number | undefined
  ) => {
    // Checks if date values in state are truthy, then call onChange
    if (_.isNil(month) || _.isNil(day) || _.isNil(year)) {
      onChange?.(null);
    } else {
      onChange?.(
        [
          _.padStart(year.toFixed(0), 4, '0'),
          _.padStart((month + 1).toFixed(0), 2, '0'),
          _.padStart(day.toFixed(0), 2, '0'),
        ].join('-')
      );
    }
  };

  return (
    <UI.HStack flex="1" spacing={1}>
      <UI.SelectWithOptions
        {...rest}
        value={month}
        onChange={(e) => {
          const newMonth = coerceDatePart(e.target.value);
          setMonth(newMonth);
          handleDateChange(newMonth, day, year);
        }}
        options={monthOptionsZeroIndex}
        placeholder="—"
        flex={7}
      />
      <UI.SelectWithOptions
        {...rest}
        value={day}
        onChange={(e) => {
          const newDay = coerceDatePart(e.target.value);
          setDay(newDay);
          handleDateChange(month, newDay, year);
        }}
        options={dayOptions}
        placeholder="—"
        flex={6}
      />
      <UI.SelectWithOptions
        {...rest}
        value={year}
        onChange={(e) => {
          const newYear = coerceDatePart(e.target.value);
          setYear(newYear);
          handleDateChange(month, day, newYear);
        }}
        options={yearOptions}
        placeholder="—"
        flex={8}
      />
    </UI.HStack>
  );
};

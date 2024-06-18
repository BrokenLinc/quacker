import {
  amPmOptions,
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
const getHour = (value: Date | null | undefined) => {
  if (!value) return undefined;

  const hour24 = value.getHours();
  const hour12 = hour24 % 12;
  return hour12;
};
const getAmPm = (value: Date | null | undefined) => {
  if (!value) return undefined;

  const hour24 = value.getHours();
  const amPm = hour24 >= 12 ? 'PM' : 'AM';
  return amPm;
};

export const hourOptions = _.times(12, (i) => ({
  value: `${(i + 1) % 12}`,
  label: `${i + 1}`,
}));

export type DateTimePartsInputProps = Omit<
  UI.SelectProps,
  'value' | 'onChange'
> & {
  value?: Date | null;
  onChange?: (date: Date | null) => any;
  minuteIncrements?: 1 | 5 | 10 | 15 | 20 | 30 | 60;
};
/**
 * A component that renders a date & time input as six select boxes (month, day, year, hour, minute, amPm),
 * The input value, and onChange value is a date object.
 * The component has its own internal state, so that the user can adjust individual the select boxes without the select boxes resetting.
 */
export const DateTimePartsInput: React.FC<DateTimePartsInputProps> = (
  props
) => {
  const { value, onChange, minuteIncrements = 1, ...rest } = props;
  const didValueChange = value !== usePrevious(value);
  const [month, setMonth] = React.useState(value?.getMonth());
  const [day, setDay] = React.useState(value?.getDate());
  const [year, setYear] = React.useState(value?.getFullYear());
  const [hour, setHour] = React.useState(getHour(value));
  const [minute, setMinute] = React.useState(value?.getMinutes());
  const [amPm, setAmPm] = React.useState(getAmPm(value));

  // Create custom minute options based on minuteIncrements
  const minuteOptions = React.useMemo(() => {
    return _.times(60 / minuteIncrements, (i) => {
      const minute = i * (minuteIncrements || 1);
      return {
        value: minute,
        label: _.padStart(`${minute}`, 2, '0'),
      };
    });
  }, [minuteIncrements]);

  // If value is changed externally, update internal state
  React.useEffect(() => {
    if (value && didValueChange) {
      setMonth(value?.getMonth());
      setDay(value?.getDate());
      setYear(value?.getFullYear());
      setHour(getHour(value));
      setMinute(value?.getMinutes());
      setAmPm(getAmPm(value));
    }
  }, [value, didValueChange]);

  const handleDateChange = (
    month: number | undefined,
    day: number | undefined,
    year: number | undefined,
    hour: number | undefined,
    minute: number | undefined,
    amPm: string | undefined
  ) => {
    // Checks if date values in state are truthy, then call onChange
    if (
      _.isNil(month) ||
      _.isNil(day) ||
      _.isNil(year) ||
      _.isNil(hour) ||
      _.isNil(minute) ||
      _.isNil(amPm)
    ) {
      onChange?.(null);
    } else {
      // construct a date object, making sure to handle AM/PM and 12-hour time
      const hour24 = hour + (amPm === 'PM' ? 12 : 0);
      const newDate = new Date(year, month, day, hour24, minute);
      onChange?.(newDate);
    }
  };

  return (
    <UI.HStack spacing={1} minW="480px">
      <UI.SelectWithOptions
        {...rest}
        value={month}
        onChange={(e) => {
          const newMonth = coerceDatePart(e.target.value);
          setMonth(newMonth);
          handleDateChange(newMonth, day, year, hour, minute, amPm);
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
          handleDateChange(month, newDay, year, hour, minute, amPm);
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
          handleDateChange(month, day, newYear, hour, minute, amPm);
        }}
        options={yearOptions}
        placeholder="—"
        flex={8}
      />
      <UI.SelectWithOptions
        placeholder="—"
        {...rest}
        value={hour}
        onChange={(e) => {
          const newHour = _.isNil(e.target.value)
            ? undefined
            : parseInt(e.target.value);
          setHour(newHour);
          handleDateChange(month, day, year, newHour, minute, amPm);
        }}
        options={hourOptions}
        flex={6}
      />
      <UI.SelectWithOptions
        placeholder="—"
        {...rest}
        value={minute}
        onChange={(e) => {
          const newMinute = _.isNil(e.target.value)
            ? undefined
            : parseInt(e.target.value);
          setMinute(newMinute);
          handleDateChange(month, day, year, hour, newMinute, amPm);
        }}
        options={minuteOptions}
        flex={6}
      />
      <UI.SelectWithOptions
        placeholder="—"
        {...rest}
        value={amPm}
        onChange={(e) => {
          const newAmPm = e.target.value;
          setAmPm(newAmPm);
          handleDateChange(month, day, year, hour, minute, newAmPm);
        }}
        options={amPmOptions}
        flex={6}
      />
    </UI.HStack>
  );
};

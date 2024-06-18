import { amPmOptions, hourOptions } from '@@helpers/dateOptions';
import * as UI from '@@ui';
import { format, parse } from 'date-fns';
import _ from 'lodash';
import React from 'react';
import { usePrevious } from 'react-use';

const externalFormat = 'HH:mm:ss';

/**
 * Methods to exchange external and internal formatting
 */
const getInternalValue = (value: string | null | undefined, token: string) => {
  if (!value) return undefined;
  const valueWithoutMilliseconds = value.split('.')[0];
  return format(
    parse(valueWithoutMilliseconds, externalFormat, new Date()),
    token
  );
};
const getExternalValue = (
  hour: string | undefined,
  minute: string | undefined,
  amPm: string | undefined
) => {
  if (!hour || !minute || !amPm) return null;
  return format(
    parse(`${hour}:${minute} ${amPm}`, 'h:mm a', new Date()),
    externalFormat
  );
};
const getHour = (value: string | null | undefined) => {
  return getInternalValue(value, 'h');
};
const getMinute = (value: string | null | undefined) => {
  return getInternalValue(value, 'mm');
};
const getAmPm = (value: string | null | undefined) => {
  return getInternalValue(value, 'a');
};

export type TimeOnlyPartsInputProps = Omit<
  UI.SelectProps,
  'value' | 'onChange'
> & {
  value?: string | null;
  onChange?: (date: string | null) => any;
  minuteIncrements?: 1 | 5 | 10 | 15 | 20 | 30 | 60;
};
/**
 * A component that renders a time input as three select boxes (hour, minute, amPm),
 * The input value, and onChange value is a string.
 * The component is "dateless" in that it does not include a date component.
 * The component has its own internal state, so that the user can adjust individual the select boxes without the select boxes resetting.
 */
export const TimeOnlyPartsInput: React.FC<TimeOnlyPartsInputProps> = (
  props
) => {
  const { value, onChange, minuteIncrements = 1, ...rest } = props;
  const didValueChange = value !== usePrevious(value);
  const [hour, setHour] = React.useState(getHour(value));
  const [minute, setMinute] = React.useState(getMinute(value));
  const [amPm, setAmPm] = React.useState(getAmPm(value));

  // Create custom minute options based on minuteIncrements
  const minuteOptions = React.useMemo(() => {
    return _.times(60 / minuteIncrements, (i) => {
      const minute = i * (minuteIncrements || 1);
      return {
        value: _.padStart(`${minute}`, 2, '0'),
        label: _.padStart(`${minute}`, 2, '0'),
      };
    });
  }, [minuteIncrements]);

  // If value is changed externally, update internal state
  React.useEffect(() => {
    if (value && didValueChange) {
      setHour(getHour(value));
      setMinute(getMinute(value));
      setAmPm(getAmPm(value));
    }
  }, [value, didValueChange]);

  const handleDateChange = (
    hour: string | undefined,
    minute: string | undefined,
    amPm: string | undefined
  ) => {
    // Checks if date values in state are truthy, then call onChange
    if (_.isNil(hour) || _.isNil(minute) || _.isNil(amPm)) {
      onChange?.(null);
    } else {
      onChange?.(getExternalValue(hour, minute, amPm));
    }
  };

  return (
    <UI.HStack spacing={1}>
      <UI.SelectWithOptions
        placeholder="—"
        minW="72px"
        {...rest}
        value={hour}
        onChange={(e) => {
          const newHour = e.target.value;
          setHour(newHour);
          handleDateChange(newHour, minute, amPm);
        }}
        options={hourOptions}
      />
      <UI.SelectWithOptions
        placeholder="—"
        minW="72px"
        {...rest}
        value={minute}
        onChange={(e) => {
          const newMinute = e.target.value;
          setMinute(newMinute);
          handleDateChange(hour, newMinute, amPm);
        }}
        options={minuteOptions}
      />
      <UI.SelectWithOptions
        placeholder="—"
        minW="72px"
        {...rest}
        value={amPm}
        onChange={(e) => {
          const newAmPm = e.target.value;
          setAmPm(newAmPm);
          handleDateChange(hour, minute, newAmPm);
        }}
        options={amPmOptions}
      />
    </UI.HStack>
  );
};

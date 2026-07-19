import * as UI from './chakra-compat';
import {
  FontAwesomeIcon,
  FontAwesomeIconProps,
} from '@fortawesome/react-fontawesome';
import React from 'react';
import { useDebounce, usePrevious } from 'react-use';

export const INPUT_DEBOUNCE_MS = 500;

export type DebouncedInputProps = {
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
  leftIcon?: FontAwesomeIconProps;
  rightIcon?: FontAwesomeIconProps;
  isDisabled?: boolean;
} & Omit<UI.InputProps, 'value' | 'onChange'>;

export const DebouncedInput: React.FC<DebouncedInputProps> = (props) => {
  const {
    value: initialValue = '',
    onChange,
    debounce = INPUT_DEBOUNCE_MS,
    leftIcon,
    rightIcon,
    isDisabled,
    ...inputProps
  } = props;
  const [value, setValue] = React.useState(initialValue);
  const previousValue = usePrevious(value) ?? value;

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useDebounce(
    () => {
      if (value === previousValue) return;
      onChange(value);
    },
    debounce,
    [value, previousValue]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDisabled) {
      setValue(e.target.value);
    }
  };

  return (
    <UI.InputGroup
      startElement={
        leftIcon ? <FontAwesomeIcon {...leftIcon} /> : undefined
      }
      endElement={
        rightIcon ? <FontAwesomeIcon {...rightIcon} /> : undefined
      }
    >
      <UI.Input
        {...inputProps}
        disabled={isDisabled}
        value={value}
        onChange={handleChange}
      />
    </UI.InputGroup>
  );
};

import * as UI from '@chakra-ui/react';
import React from 'react';
import CurrencyInput, { CurrencyInputProps } from 'react-currency-input-field';

/**
 * A currency input that combines the functionality of react-currency-input-field with
 * Chakra UI's Input component.
 * It expects a float number as its value (eg. -1, 0, 1.1, 1111.11), and emits a float.
 */
export type MoneyInputProps = {
  value?: number | null | undefined;
  onChange?(value: number | null | undefined): any;
} & Omit<UI.InputProps & CurrencyInputProps, 'value' | 'onChange'>;
export const MoneyInput: React.FC<MoneyInputProps> = (props) => {
  const { value, onChange, ...restProps } = props;

  const [inputValue, setInputValue] = React.useState<string>(
    value?.toFixed(2) || ''
  );

  /**
   * Update the component state and emit the new value when the input changes.
   */
  const handleChange = (value: string | undefined) => {
    setInputValue(value || '');
    const parsedValue = parseFloat(value || '');
    onChange?.(Number.isNaN(parsedValue) ? null : parsedValue);
  };

  /**
   * Clean up formatting when the input loses focus.
   */
  const handleBlur = () => {
    // If the input has a value, format it to 2 decimal places
    if (inputValue !== '') {
      setInputValue(parseFloat(inputValue).toFixed(2));
    }
  };

  /**
   * If the value prop changes, update the input value.
   * Check if the underlying numeric value has actually changed
   * (Don't interrupt formatting edits to the input value mid-edit)
   */
  React.useEffect(() => {
    if (parseFloat(inputValue) !== value) {
      setInputValue(value?.toFixed(2) || '');
    }
  }, [value]);

  return (
    <UI.Input
      as={CurrencyInput}
      onValueChange={handleChange}
      onBlur={handleBlur}
      value={inputValue}
      prefix="$"
      {...restProps}
    />
  );
};

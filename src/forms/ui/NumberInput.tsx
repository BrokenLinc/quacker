import * as UI from '@chakra-ui/react';
import React from 'react';
import { NumericFormat, NumericFormatProps } from 'react-number-format';

/**
 * A number input that combines the functionality of react-number-format with
 * Chakra UI's Input component.
 */
export type NumberInputProps = NumericFormatProps<UI.InputProps>;
export const NumberInput: React.FC<NumberInputProps> = (props) => {
  return (
    <NumericFormat thousandSeparator="," customInput={UI.Input} {...props} />
  );
};

import * as UI from '@chakra-ui/react';
import React from 'react';

const styledAsInputProps = {
  border: '1px solid',
  borderColor: 'gray.300',
  borderRadius: 'md',
  pl: 2,
  pr: 3,
};

/**
 * A checkbox input with a label
 */
export type CheckboxInputProps = {
  label?: string;
  styledAsInput?: boolean;
} & UI.CheckboxProps;
export const CheckboxInput = React.forwardRef<
  HTMLInputElement,
  CheckboxInputProps
>(({ label, children, styledAsInput, ...restProps }, ref) => {
  return (
    <UI.Checkbox
      ref={ref}
      py={2}
      size="lg"
      my="1px"
      alignItems="start"
      {...(styledAsInput ? styledAsInputProps : undefined)}
      {...restProps}
    >
      {label ? <UI.Text fontSize="sm">{label}</UI.Text> : children}
    </UI.Checkbox>
  );
});

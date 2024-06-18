import * as UI from '@chakra-ui/react';
import React from 'react';

/**
 * A select input with options prop
 */
export type SelectWithOptionsProps = {
  options: { label: string | number; value: any }[];
} & UI.SelectProps;
export const SelectWithOptions = React.forwardRef<
  HTMLSelectElement,
  SelectWithOptionsProps
>(({ options, onChange, placeholder = 'Choose one', ...restProps }, ref) => {
  if (restProps.isReadOnly) {
    // The readOnly select is still interactive, so we display this instead
    return (
      <UI.Input
        isReadOnly
        value={options?.find((o) => o.value === restProps.value)?.label}
      />
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Look up the original value from the options list
    let value = placeholder
      ? options[e.target.selectedIndex - 1]?.value ?? null
      : options[e.target.selectedIndex]?.value ?? null;

    // create a new event with the original value
    const eventWithOriginalValue: React.ChangeEvent<HTMLSelectElement> = {
      ...e,
      target: {
        ...e.target,
        value,
      },
    };
    onChange?.(eventWithOriginalValue);
  };
  return (
    <UI.Select
      ref={ref}
      placeholder={placeholder}
      onChange={handleChange}
      {...restProps}
      value={restProps.value ?? ''}
    >
      {options.map((option) => (
        <option key={JSON.stringify(option.value)} value={option.value}>
          {option.label}
        </option>
      ))}
    </UI.Select>
  );
});

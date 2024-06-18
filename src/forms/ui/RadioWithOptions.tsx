import * as UI from '@chakra-ui/react';
import React from 'react';

/**
 * A radio group with list of labeled options
 */
export type RadioWithOptionsProps = {
  options: {
    value: string | number | boolean;
    label: string | number;
    isDisabled?: boolean;
  }[];
  direction?: 'horizontal' | 'vertical' | undefined;
  isReadOnly?: boolean;
} & Omit<UI.RadioGroupProps, 'children'>;
export const RadioWithOptions: React.FC<RadioWithOptionsProps> = (props) => {
  const { options, onChange, value, direction, isReadOnly, ...restProps } =
    props;

  const handleChange = (value: string) => {
    // Look up the original value from the options list
    // This allows for strings or numbers
    let originalValue = options.find(
      (option) => option.value.toString() === value
    )?.value;
    onChange?.(originalValue as string);
  };

  const optionElements = options.map((option) => {
    const checked = value?.toString() === option.value.toString();
    return (
      <UI.Radio
        key={option.value.toString()}
        value={option.value.toString()}
        isDisabled={option.isDisabled || (isReadOnly && !checked)}
        isReadOnly={isReadOnly}
        colorScheme={isReadOnly ? 'purple' : undefined}
      >
        {option.label}
      </UI.Radio>
    );
  });

  return (
    <UI.RadioGroup
      value={value?.toString()}
      onChange={handleChange}
      {...restProps}
    >
      {direction === 'horizontal' ? (
        <UI.HStack alignItems="center" spacing={4} minH={10}>
          {optionElements}
        </UI.HStack>
      ) : (
        /* These stack dimensions render a 2-option radio that is the same
            height as other form inputs. */
        <UI.VStack alignItems="start" spacing={0} my="-2px">
          {optionElements}
        </UI.VStack>
      )}
    </UI.RadioGroup>
  );
};

import * as UI from '@@ui';

/**
 * A checkbox group with options prop
 * And methods for wrapping and unwrapping the primitive checkbox values
 */

export type CheckboxGroupWithOptionsProps = Omit<
  UI.CheckboxGroupProps,
  'children'
> & {
  options: { label: string; value: any; isDimmed?: boolean }[];
  getCheckboxValue?: (value: any) => string | number;
  getOutputValue?: (value: string | number) => any;
  stackProps?: UI.StackProps;
};

export const CheckboxGroupWithOptions: React.FC<
  CheckboxGroupWithOptionsProps
> = ({
  options,
  getCheckboxValue = (value) => value,
  getOutputValue = (value) => value,
  onChange,
  stackProps,
  value,
  ...restProps
}) => {
  const handleChange: UI.CheckboxGroupProps['onChange'] = (e) => {
    const outputValues = e.map(getOutputValue) as (string | number)[];
    onChange?.(outputValues);
  };

  const checkboxGroupValue = value?.map(getCheckboxValue);

  return (
    <UI.CheckboxGroup
      {...restProps}
      onChange={handleChange}
      value={checkboxGroupValue}
    >
      <UI.Stack alignItems="start" direction="column" {...stackProps}>
        {options.map((option) => {
          return (
            <UI.Checkbox
              key={option.value}
              value={option.value}
              size="lg"
              alignItems="start"
            >
              <UI.Text
                fontSize="sm"
                color={option.isDimmed ? 'gray.300' : undefined}
                textDecoration={option.isDimmed ? 'line-through' : undefined}
              >
                {option.label}
              </UI.Text>
            </UI.Checkbox>
          );
        })}
      </UI.Stack>
    </UI.CheckboxGroup>
  );
};

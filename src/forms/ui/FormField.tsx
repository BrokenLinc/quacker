import { getFallbackFieldLabel } from '@@helpers/stringHelpers';
import * as UI from '@chakra-ui/react';
import _ from 'lodash';
import React from 'react';
import { useFormContext } from 'react-hook-form';

import { formatError } from '../helpers/formatError';
import { FormInput, FormInputProps } from './FormInput';
import { FullFormControl, FullFormControlProps } from './FullFormControl';

/* Renders a form-control-display wrapper with dynamic form-input */
/* Must be placed inside a form-context-provider */
export type FormFieldProps = Omit<FullFormControlProps, 'type'> &
  FormInputProps;
export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type,
  input,
  highlightWhenDirty,
  children,
  ...restProps
}) => {
  // Pull error out of formState
  const form = useFormContext();
  const errors = _.get(form.formState.errors, name);

  const fallbackLabel = getFallbackFieldLabel(name);

  return (
    <FullFormControl
      {...restProps}
      name={name}
      label={label ?? fallbackLabel}
      isInvalid={!!errors}
      errorMessage={formatError(errors)}
      isDisabled={form.formState.isSubmitting}
    >
      <UI.HStack>
        {/* TODO: figure out why the types are causing a conflict here */}
        {/* @ts-ignore */}
        <FormInput
          name={name}
          type={type}
          input={input}
          highlightWhenDirty={highlightWhenDirty}
        />
        {children}
      </UI.HStack>
    </FullFormControl>
  );
};

import * as UI from '@chakra-ui/react';
import _ from 'lodash';
import React from 'react';
import { useFormContext } from 'react-hook-form';

import { formatError } from '../helpers/formatError';
import { FormInput, FormInputProps } from './FormInput';
import { FullFormControl, FullFormControlProps } from './FullFormControl';

/* Renders a form-control-display wrapper with multiple dynamic form-inputs */
/* Must be placed inside a form-context-provider */
export type FormMultiFieldProps = Omit<FullFormControlProps, 'type'> & {
  fields: FormInputProps[];
};
export const FormMultiField: React.FC<FormMultiFieldProps> = ({
  label,
  name,
  fields,
  children,
  ...restProps
}) => {
  // Pull errors out of formState
  const form = useFormContext();
  const error = _.compact(
    _.map(fields, (field) => _.get(form.formState.errors, field.name))
  );
  const errorMessages = _.uniq(_.map(error, (err) => formatError(err)));
  // Note, there is no fallback label here, unlike the single field

  return (
    <FullFormControl
      {...restProps}
      name={name}
      label={label}
      isInvalid={!_.isEmpty(error)}
      errorMessage={errorMessages.join(' ')}
      isDisabled={form.formState.isSubmitting}
    >
      <UI.HStack>
        {fields.map(({ name, type, input }) => (
          // TODO: figure out why the types are causing a conflict here
          // @ts-ignore
          <FormInput key={name} name={name} type={type} input={input} />
        ))}
        {children}
      </UI.HStack>
    </FullFormControl>
  );
};

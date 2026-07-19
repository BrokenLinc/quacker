import {
  Field,
  type FieldRootProps,
  type FieldLabelProps,
  type FieldHelperTextProps,
  type FieldErrorTextProps,
} from '@chakra-ui/react';
import React from 'react';
import { mapV2Props } from './props';

export type FormControlProps = FieldRootProps & {
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
};

export const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  function FormControl(props, ref) {
    return <Field.Root ref={ref} {...mapV2Props(props)} />;
  }
);

export type FormLabelProps = FieldLabelProps;

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  function FormLabel(props, ref) {
    return <Field.Label ref={ref} {...mapV2Props(props)} />;
  }
);

export const FormHelperText = React.forwardRef<
  HTMLDivElement,
  FieldHelperTextProps
>(function FormHelperText(props, ref) {
  return <Field.HelperText ref={ref} {...mapV2Props(props)} />;
});

export const FormErrorMessage = React.forwardRef<
  HTMLDivElement,
  FieldErrorTextProps
>(function FormErrorMessage(props, ref) {
  return <Field.ErrorText ref={ref} {...mapV2Props(props)} />;
});

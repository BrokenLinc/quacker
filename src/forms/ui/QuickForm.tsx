import * as UI from '@chakra-ui/react';
import React from 'react';
import { FieldValues } from 'react-hook-form';
import { UseHookFormReturn } from '../hooks/useHookForm';
import { Form } from './Form';
import { FormButtonGroup } from './FormButtonGroup';
import { FormErrorAlertMessage } from './FormErrorAlertMessage';
import { SubmitButton } from './SubmitButton';

/**
 * Creates a form with an error message and submit button.
 * */
export type QuickFormProps<TFieldValues extends FieldValues = FieldValues> =
  React.PropsWithChildren<{
    form: UseHookFormReturn<TFieldValues>;
    submitButtonLabel?: string;
    extraButtons?: React.ReactNode;
    centered?: boolean;
    disableSubmitWhenInvalid?: boolean;
  }>;
export function QuickForm<TFieldValues extends FieldValues = FieldValues>(
  props: QuickFormProps<TFieldValues>
): JSX.Element {
  const {
    form,
    submitButtonLabel,
    extraButtons,
    children,
    centered,
    disableSubmitWhenInvalid,
  } = props;
  return (
    <Form form={form}>
      <UI.VStack spacing="6" alignItems={centered ? 'center' : 'stretch'}>
        {children}
        <FormErrorAlertMessage form={form} />
        <FormButtonGroup
          justifyContent={centered ? 'center' : undefined}
          mt="2"
        >
          <SubmitButton
            isDisabled={disableSubmitWhenInvalid && !form.formState.isValid}
          >
            {submitButtonLabel || 'Save'}
          </SubmitButton>
          {extraButtons}
        </FormButtonGroup>
      </UI.VStack>
    </Form>
  );
}

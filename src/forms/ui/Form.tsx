import * as UI from '@@ui';
import React from 'react';
import { FieldValues, FormProvider } from 'react-hook-form';
import { UseHookFormReturn } from '../hooks/useHookForm';

/**
 * Creates a form-context-provider,and renders a form element and form-grid with children
 * */
export function Form<TFieldValues extends FieldValues = FieldValues>(
  props: React.PropsWithChildren<
    UI.BoxProps & {
      form: UseHookFormReturn<TFieldValues>;
    }
  >
): JSX.Element {
  const { form, ...restProps } = props;
  return (
    <FormProvider {...form}>
      <UI.Box as="form" onSubmit={form.onSubmit} {...restProps} />
    </FormProvider>
  );
}

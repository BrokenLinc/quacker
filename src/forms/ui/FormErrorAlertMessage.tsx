import { FieldValues } from 'react-hook-form';
import { UseHookFormReturn } from '../hooks/useHookForm';
import { AlertMessage, AlertMessageProps } from './AlertMessage';

/**
 * Displays a whole-form error.
 * */
export type FormErrorAlertMessageProps<
  TFieldValues extends FieldValues = FieldValues
> = AlertMessageProps & {
  form: UseHookFormReturn<TFieldValues>;
};
export function FormErrorAlertMessage<
  TFieldValues extends FieldValues = FieldValues
>(props: FormErrorAlertMessageProps<TFieldValues>): JSX.Element {
  const error = props.form.formState.error;
  return (
    <AlertMessage>
      {Array.isArray(error) ? error.join(', ') : error}
    </AlertMessage>
  );
}

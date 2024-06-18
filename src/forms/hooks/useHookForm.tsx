import { useRefresh } from '@@routing/RefreshProvider';
import * as UI from '@@ui';
import _ from 'lodash';
import React from 'react';
import {
  FieldValues,
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
  UseFormProps,
} from 'react-hook-form';

/**
 * A wrapper around react-hook-form's useForm hook
 * that provides default props and supports onValid and onInvalid callbacks.
 */

export type UseHookFormReturn<TFieldValues extends FieldValues = FieldValues> =
  ReturnType<typeof useHookForm<TFieldValues, any>>;

export function useHookForm<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any
>(
  props: UseFormProps<TFieldValues, TContext> & {
    isReadOnly?: boolean | ((fieldName: string) => boolean);
    onValid?: SubmitHandler<TFieldValues>;
    onInvalid?: SubmitErrorHandler<TFieldValues>;
    successToast?: boolean;
    totalFailureToast?: boolean;
    refreshOnValid?: boolean;
  }
) {
  const {
    onInvalid,
    onValid,
    successToast = true,
    totalFailureToast = true,
    isReadOnly,
    refreshOnValid,
    ...restProps
  } = props;
  const form = useForm<TFieldValues, TContext>({
    mode: 'onTouched',
    ...restProps,
  });
  const [error, setError] = React.useState<string | string[]>();
  const toast = UI.useToast();
  const refresh = useRefresh();

  const toastSuccess = () => {
    if (!toast.isActive('form-success')) {
      toast({
        id: 'form-success',
        title: 'Done!',
        description: 'The form was submitted successfully.',
        status: 'success',
      });
    }
  };

  const toastError = () => {
    if (!toast.isActive('form-error')) {
      toast({
        id: 'form-error',
        title: 'Oops!',
        description: 'Please check the form for errors and try again.',
        status: 'error',
      });
    }
  };

  const handleValid: SubmitHandler<TFieldValues> = async (data) => {
    try {
      setError(undefined);
      await onValid?.(data);
      if (refreshOnValid) {
        refresh();
      }
      if (successToast) {
        toastSuccess();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || error);
      if (totalFailureToast) {
        toastError();
      }
    }
  };

  const handleInvalid: SubmitErrorHandler<TFieldValues> = async (errors) => {
    try {
      setError(undefined);
      await onInvalid?.(errors);
      toastError();
    } catch (error: any) {
      setError(error.message);
      if (totalFailureToast) {
        toastError();
      }
    }
  };

  const originalFormReset = form.reset;
  const reset: typeof form.reset = (values, keepStateOptions) => {
    setError(undefined);
    originalFormReset(values, keepStateOptions);
  };

  const onSubmit = form.handleSubmit(handleValid, handleInvalid);

  return _.merge(form, { onSubmit, reset, formState: { error, isReadOnly } });
}

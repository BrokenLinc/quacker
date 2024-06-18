import _ from 'lodash';
import { FieldValues, Path, useFormContext } from 'react-hook-form';

export function useFormHasFieldValues<
  TFieldValues extends FieldValues = FieldValues
>(paths: Path<TFieldValues>[]) {
  const form = useFormContext<TFieldValues>();
  const values = form.watch(paths);
  const filledValues = _.filter(values, (value) => {
    return !_.isNil(value);
  });
  return !_.isEmpty(_.flatten(filledValues));
}

export function useFormHasFieldErrors<
  TFieldValues extends FieldValues = FieldValues
>(paths: Path<TFieldValues>[]) {
  const form = useFormContext<TFieldValues>();
  const errors = _.filter(paths, (path) => {
    return !!_.get(form.formState.errors, path);
  });
  return !_.isEmpty(errors);
}

export function useFormFieldInfos<
  TFieldValues extends FieldValues = FieldValues
>(paths: Path<TFieldValues>[]) {
  return {
    hasValues: useFormHasFieldValues(paths),
    hasErrors: useFormHasFieldErrors(paths),
  };
}

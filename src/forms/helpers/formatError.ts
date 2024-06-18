import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';

/**
 * Utility to capitalize the first letter of a string, and add a period.
 */
export const formatError = (
  fieldError:
    | FieldError
    | Merge<FieldError, FieldErrorsImpl<any>>
    | Partial<{
        type: string | number;
        message: string;
      }>
    | undefined
) => {
  if (fieldError?.message === undefined) return '';
  if (typeof fieldError.message === 'object') return '';
  return (
    fieldError.message.charAt(0).toUpperCase() +
    fieldError.message.slice(1) +
    '.'
  );
};

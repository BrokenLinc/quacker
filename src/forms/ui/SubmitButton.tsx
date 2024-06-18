import * as UI from '@chakra-ui/react';
import React from 'react';
import { useFormContext } from 'react-hook-form';

/* Must be placed inside a form-context-provider */
export const SubmitButton: React.FC<UI.ButtonProps> = ({
  children,
  ...restProps
}) => {
  const form = useFormContext();

  // @ts-ignore: typing the hook call caused my IDE to hang
  if (form.formState.isReadOnly === true) return null;

  return (
    <UI.Button
      type="submit"
      colorScheme="purple"
      variant="primary"
      isDisabled={form.formState.isSubmitting}
      {...restProps}
    >
      {children}
    </UI.Button>
  );
};

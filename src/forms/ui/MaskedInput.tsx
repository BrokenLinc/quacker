import React from 'react';
import { MaskedInput as RHMMaskedInput, useWebMask } from 'react-hook-mask';

import { Input, type InputProps } from '../../ui/Input';

/**
 * A masked input that combines the functionality of react-hook-mask with
 * Chakra UI's Input component.
 */
export type MaskedInputProps = Parameters<typeof RHMMaskedInput>[0] &
  InputProps;
export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  (
    {
      value = '',
      onChange,
      maskGenerator,
      keepMask,
      allowPasswordManager,
      ...restProps
    },
    ref
  ) => {
    const webMask = useWebMask({
      value,
      onChange,
      maskGenerator,
      keepMask,
      ref,
    });
    return (
      <Input
        allowPasswordManager={allowPasswordManager}
        {...restProps}
        {...webMask}
      />
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

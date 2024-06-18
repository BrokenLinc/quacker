import * as UI from '@chakra-ui/react';
import React from 'react';
import { MaskedInput as RHMMaskedInput, useWebMask } from 'react-hook-mask';

/**
 * A masked input that combines the functionality of react-hook-mask with
 * Chakra UI's Input component.
 */
export type MaskedInputProps = Parameters<typeof RHMMaskedInput>[0] &
  UI.InputProps;
export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ value = '', onChange, maskGenerator, keepMask, ...restProps }, ref) => {
    const webMask = useWebMask({
      value,
      onChange,
      maskGenerator,
      keepMask,
      ref,
    });
    return <UI.Input {...restProps} {...webMask} />;
  }
);

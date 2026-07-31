import {
  forwardRef,
  Input as ChakraInput,
  type InputProps as ChakraInputProps,
} from '@chakra-ui/react';

import { passwordManagerIgnoreProps } from './passwordManagerIgnore';

export type InputProps = ChakraInputProps & {
  /**
   * When true, skip password-manager ignore attrs (real login / credential
   * fields only — phone sign-in, password, etc.).
   */
  allowPasswordManager?: boolean;
};

/**
 * Chakra Input with password-manager ignore by default. Non-credential fields
 * (room name, display name, search) should keep the default; set
 * `allowPasswordManager` only for authentic credential entry.
 */
export const Input = forwardRef<InputProps, 'input'>(
  ({ allowPasswordManager = false, ...rest }, ref) => (
    <ChakraInput
      ref={ref}
      {...(allowPasswordManager ? null : passwordManagerIgnoreProps)}
      {...rest}
    />
  )
);

Input.displayName = 'Input';

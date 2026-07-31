import {
  useToast as useChakraToast,
  type UseToastOptions,
} from '@chakra-ui/react';

const TOAST_DEFAULTS: UseToastOptions = {
  isClosable: true,
};

/**
 * Chakra useToast with app defaults (close button on every toast).
 * Pass options to override; set `isClosable: false` to opt out.
 */
export const useToast = (options?: UseToastOptions) =>
  useChakraToast({ ...TOAST_DEFAULTS, ...options });

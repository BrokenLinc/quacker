import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import { ColorModeProvider } from '../components/ui/color-mode';
import { system } from './system';

/**
 * Customizes the Chakra theme and provides it via context.
 */
export const ThemeProvider: React.FC<React.PropsWithChildren> = (props) => {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider defaultTheme="light">{props.children}</ColorModeProvider>
    </ChakraProvider>
  );
};

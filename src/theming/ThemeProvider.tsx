import { ChakraProvider, ColorModeScript, extendTheme } from '@chakra-ui/react';
import React from 'react';

export const theme = extendTheme({
  components: {
    initialColorMode: 'system',
    useSystemColorMode: false,
    Link: {
      baseStyle: {
        color: 'blue.500',
        textDecoration: 'underline',
        _hover: {
          textDecoration: 'none',
        },
      },
    },
  },
});

/**
 * Customizes the Chakra theme and provides it via context.
 */
export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = (props) => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      {props.children}
    </ChakraProvider>
  );
};

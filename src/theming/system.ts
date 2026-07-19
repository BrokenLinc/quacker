import { createSystem, defaultConfig } from '@chakra-ui/react';

export const system = createSystem(defaultConfig, {
  theme: {
    recipes: {
      link: {
        base: {
          color: 'blue.500',
          textDecoration: 'underline',
          _hover: {
            textDecoration: 'none',
          },
        },
      },
    },
  },
});

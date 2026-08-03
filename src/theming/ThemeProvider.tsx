import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import React from 'react';

import { useThemeColorMeta } from '@@lib/pwa/useThemeColorMeta';

/**
 * Yowl visual system:
 * - Purple is the brand/neutral foundation: the `gray` scale is purple-tinted
 *   so chrome, surfaces, and borders carry brand character without signaling
 *   status.
 * - Teal (`action`) is reserved for things the user can do: primary buttons,
 *   links, switches, focus rings.
 * - Green/red/amber/blue remain independent semantic status colors.
 * - Feel: clean, soft, native, with light skeuomorphism (sunken inputs,
 *   gentle elevation, tactile pressed states). No gradients or gloss.
 */

const FONT_STACK = `'Nunito Sans Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;

export const theme = extendTheme({
  config: {
    initialColorMode: 'system',
    useSystemColorMode: true,
  },
  fonts: {
    heading: FONT_STACK,
    body: FONT_STACK,
  },
  colors: {
    // Purple-tinted neutrals (brand-as-foundation)
    gray: {
      50: '#FAF9FC',
      100: '#F2F0F7',
      200: '#E6E2EF',
      300: '#D3CDE3',
      400: '#A79FBE',
      500: '#7B7295',
      600: '#5D5477',
      700: '#48405E',
      800: '#302A44',
      900: '#221D33',
      950: '#18142A',
    },
    // Brand purple accents (identity moments, selected nav)
    brand: {
      50: '#F7F3FF',
      100: '#EDE4FF',
      200: '#D9C7FE',
      300: '#C0A4F9',
      400: '#A57DF2',
      500: '#8B5CE6',
      600: '#7443CC',
      700: '#5D34A6',
      800: '#48287F',
      900: '#351E5C',
    },
    // Teal actions (buttons, links, switches, focus)
    action: {
      50: '#EDFAF8',
      100: '#D2F3EE',
      200: '#A3E6DD',
      300: '#6BD3C7',
      400: '#38BAAE',
      500: '#149E93',
      600: '#0C7F77',
      700: '#0B655F',
      800: '#0C4F4B',
      900: '#0B3E3B',
    },
  },
  semanticTokens: {
    colors: {
      'surface.canvas': { default: 'gray.50', _dark: 'gray.900' },
      'surface.raised': { default: 'white', _dark: 'gray.800' },
      'surface.sunken': { default: 'gray.100', _dark: 'gray.950' },
      'border.subtle': { default: 'gray.200', _dark: 'gray.700' },
      'text.muted': { default: 'gray.500', _dark: 'gray.400' },
      'nav.selected': { default: 'brand.100', _dark: 'brand.900' },
    },
  },
  shadows: {
    // Teal focus ring — action hue signals interactivity
    outline: '0 0 0 3px rgba(20, 158, 147, 0.45)',
  },
  styles: {
    global: {
      // Document plane = raised (Safari accessory / overscroll sample body).
      // Content plane = canvas on #root / AppShell.
      'html, body': {
        bg: 'surface.raised',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        // Drive iOS system keyboard / form controls to match in-app mode.
        colorScheme: 'light',
        _dark: { colorScheme: 'dark' },
      },
      // Geometry for #root lives in index.html (browser inset vs standalone
      // height:100vh — WebKit 254868). Only paint/overflow here.
      '#root': {
        bg: 'surface.canvas',
        overflow: 'hidden',
      },
    },
  },
  components: {
    Link: {
      baseStyle: {
        color: 'action.600',
        textDecoration: 'underline',
        _dark: { color: 'action.300' },
        _hover: {
          textDecoration: 'none',
        },
      },
    },
    Button: {
      baseStyle: {
        // Tactile pressed state (light skeuomorphism)
        _active: { transform: 'translateY(1px)' },
        transitionProperty: 'common',
        transitionDuration: 'fast',
      },
    },
    IconButton: {
      variants: {
        solid: {
          _disabled: {
            opacity: 1,
            bg: 'transparent',
            color: 'text.muted',
            cursor: 'not-allowed',
            _hover: { bg: 'transparent' },
            _active: { transform: 'none' },
          },
        },
      },
    },
    Input: {
      defaultProps: {
        variant: 'filled',
        focusBorderColor: 'action.500',
      },
    },
    Textarea: {
      defaultProps: {
        variant: 'filled',
        focusBorderColor: 'action.500',
      },
    },
    Select: {
      defaultProps: {
        variant: 'filled',
        focusBorderColor: 'action.500',
      },
    },
    Switch: {
      defaultProps: {
        colorScheme: 'action',
      },
    },
    Checkbox: {
      defaultProps: {
        colorScheme: 'action',
      },
    },
    Radio: {
      defaultProps: {
        colorScheme: 'action',
      },
    },
    Progress: {
      defaultProps: {
        colorScheme: 'action',
      },
    },
    Spinner: {
      baseStyle: {
        color: 'text.muted',
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'surface.raised',
          borderWidth: '1px',
          borderColor: 'border.subtle',
          boxShadow: 'sm',
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: 'xl',
          bg: 'surface.raised',
        },
      },
    },
    Drawer: {
      baseStyle: {
        dialog: {
          bg: 'surface.raised',
        },
      },
    },
    // Programmatic focus (modal open) should not glow; keyboard Tab still rings.
    CloseButton: {
      baseStyle: {
        _focus: { boxShadow: 'none' },
        _focusVisible: { boxShadow: 'outline' },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          borderRadius: 'lg',
          borderColor: 'border.subtle',
          bg: 'surface.raised',
          boxShadow: 'lg',
        },
      },
    },
  },
});

const ThemeColorSync: React.FC = () => {
  useThemeColorMeta();
  return null;
};

/**
 * Customizes the Chakra theme and provides it via context.
 */
export const ThemeProvider: React.FC<React.PropsWithChildren> = (props) => {
  return (
    <ChakraProvider theme={theme}>
      {/* ColorModeScript lives in index.html (before React) to avoid canvas flash. */}
      <ThemeColorSync />
      {props.children}
    </ChakraProvider>
  );
};

import { useColorMode } from '@chakra-ui/react';
import React from 'react';

import { canvasColorForMode } from './canvasColors';

/**
 * Syncs the primary `theme-color` meta (and document background) with the
 * in-app color mode so system chrome matches `surface.canvas` even when the
 * user overrides prefers-color-scheme.
 */
export function useThemeColorMeta(): void {
  const { colorMode } = useColorMode();

  React.useEffect(() => {
    const color = canvasColorForMode(colorMode);
    let meta = document.querySelector(
      'meta[name="theme-color"]:not([media])'
    ) as HTMLMetaElement | null;

    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;

    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
    // Match iOS system keyboard / form controls to in-app mode.
    document.documentElement.style.colorScheme = colorMode;
  }, [colorMode]);
}

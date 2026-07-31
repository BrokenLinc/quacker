import { useColorMode } from '@chakra-ui/react';
import React from 'react';

import { canvasColorForMode, raisedColorForMode } from './canvasColors';

/**
 * Syncs theme-color + document backgrounds with in-app color mode.
 *
 * - `html`/`body` → `surface.raised` so iOS Safari keyboard accessory /
 *   overscroll match composer & header chrome (UA samples document bg).
 * - `#root` → `surface.canvas` for the app content plane.
 */
export function useThemeColorMeta(): void {
  const { colorMode } = useColorMode();

  React.useEffect(() => {
    const raised = raisedColorForMode(colorMode);
    const canvas = canvasColorForMode(colorMode);
    let meta = document.querySelector(
      'meta[name="theme-color"]:not([media])'
    ) as HTMLMetaElement | null;

    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = raised;

    document.documentElement.style.backgroundColor = raised;
    document.body.style.backgroundColor = raised;
    const root = document.getElementById('root');
    if (root) root.style.backgroundColor = canvas;
    // Match iOS system keyboard / form controls to in-app mode.
    document.documentElement.style.colorScheme = colorMode;
  }, [colorMode]);
}

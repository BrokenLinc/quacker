import { expect, type Page } from '@playwright/test';

import { CANVAS_DARK, CANVAS_LIGHT } from '../../../src/lib/pwa/canvasColors';

export type AppColorMode = 'light' | 'dark';

export const canvasForMode = (mode: AppColorMode): string =>
  mode === 'dark' ? CANVAS_DARK : CANVAS_LIGHT;

/** Chakra persists the binary toggle under this key (`light` | `dark`). */
export const COLOR_MODE_STORAGE_KEY = 'chakra-ui-color-mode';

/** Seed mode before the first document load (call before `goto`). */
export async function seedColorMode(
  page: Page,
  mode: AppColorMode
): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: COLOR_MODE_STORAGE_KEY, value: mode }
  );
}

export async function expectColorMode(
  page: Page,
  mode: AppColorMode
): Promise<void> {
  // Chakra v2 with CSS variables uses `data-theme` on <html> (not chakra-ui-* classes).
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);

  const canvas = canvasForMode(mode);
  await expect
    .poll(async () =>
      page
        .locator('meta[name="theme-color"]:not([media])')
        .getAttribute('content')
    )
    .toBe(canvas);

  // `style.backgroundColor` is browser-normalized (hex → rgb); compare via probe.
  await expect
    .poll(async () =>
      page.evaluate((hex) => {
        const actual = document.documentElement.style.backgroundColor;
        const probe = document.createElement('div');
        probe.style.backgroundColor = hex;
        const expected = probe.style.backgroundColor;
        return actual !== '' && actual === expected;
      }, canvas)
    )
    .toBe(true);
}

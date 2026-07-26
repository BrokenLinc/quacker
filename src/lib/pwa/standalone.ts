/**
 * Home Screen / installed PWA (not in-browser Safari/Chrome tabs).
 * Prefers the `html.standalone` class from `index.html`'s early script.
 */
export function isStandaloneDisplay(): boolean {
  if (document.documentElement.classList.contains('standalone')) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

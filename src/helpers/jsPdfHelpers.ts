import React from 'react';

/**
 * A hook to apply any global style changes needed to render the page in JsPDF.
 * See ThemeProvider for more context.
 */
export const usePrepPageForJsPdf = () => {
  React.useEffect(() => {
    const root = window.document.querySelector(':root');
    if (!root) return;
    root.classList.add('js-pdf-page');
    return () => {
      root.classList.remove('js-pdf-page');
    };
  });
};

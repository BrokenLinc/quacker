Here is my take: **there isn't one universal drop-in NPM package that cleans this up cross-platform**, mostly because **iOS Safari** and **Android Chrome** treat the virtual keyboard using completely different rendering models.

An NPM wrapper cannot alter how Safari forces viewport scrolling at the OS level. However, **a standard 3-layer pattern** fixes 99% of these virtual keyboard issues without heavy custom JavaScript.

---

### Layer 1: Fix Chrome & Android (The `interactive-widget` Meta Tag)

Historically, Chrome on Android resized the **Layout Viewport** (pushing sticky elements around), while iOS resized only the **Visual Viewport** (leaving `100vh` broken).

Modern browsers now support controlling this behavior via the HTML `viewport` meta tag:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content"
/>
```

- **`resizes-content`**: Forces the browser to shrink the actual layout area when the keyboard opens, keeping `100%` height elements inside the visible screen and avoiding weird overlay bugs.
- **`overlays-content`**: Keeps the layout intact while drawing the keyboard over the top (great if you use CSS environment variables to pad your inputs).

---

### Layer 2: Fix iOS Safari (Use `dvh` / `svh` + CSS Variables)

Safari ignores `interactive-widget` and handles keyboards by panning/shifting the Visual Viewport.

1. **Avoid `100vh**`: Use **`100dvh`** (Dynamic Viewport Height) or **`100svh`\*\* (Small Viewport Height) for full-screen layout containers.
2. **Handle Fixed Position Inputs**: On iOS, `position: fixed` elements attached to the bottom (like a chat input bar) often detach or get hidden behind the keyboard.

To fix iOS scrolling when focusing inputs, pair your CSS with a tiny layout lock hook:

```javascript
// Fix iOS layout scroll-shifting when inputs focus
useEffect(() => {
  const handleBlur = () => {
    // Force Safari to recalculate scroll position after keyboard dismiss
    window.scrollTo(0, 0);
  };

  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach((input) => input.addEventListener('blur', handleBlur));

  return () => {
    inputs.forEach((input) => input.removeEventListener('blur', handleBlur));
  };
}, []);
```

---

### Layer 3: Drop-In Viewport Resize Component (React)

If you want a drop-in React component that normalizes page height across both platforms using the **Visual Viewport API**, wrap your app's layout with this component:

```tsx
import React, { useEffect, useState } from 'react';

export const VirtualKeyboardViewport: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [viewportHeight, setViewportHeight] = useState<number | string>(
    '100dvh'
  );

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      // Set precise height matching the visible portion of the screen
      setViewportHeight(`${window.visualViewport?.height}px`);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  return (
    <div
      style={{
        height: viewportHeight,
        width: '100vw',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      {children}
    </div>
  );
};
```

---

### Summary Checklist

| Platform / Issue        | Solution                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Android / Chrome**    | Add `interactive-widget=resizes-content` to your `<meta name="viewport">` tag.                               |
| **iOS / Safari**        | Wrap your view in `position: fixed; height: 100dvh` or use the `window.visualViewport` sync component above. |
| **Form Inputs Jumping** | Ensure your main wrapper is `overflow: hidden` and let internal sub-containers scroll.                       |

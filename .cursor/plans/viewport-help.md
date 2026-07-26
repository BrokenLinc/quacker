# Viewport notes — superseded

Do **not** follow older advice in this file’s history (`100dvh` shell,
VV-sized `#root` while the keyboard is closed, etc.). That path fights
[WebKit 254868](https://bugs.webkit.org/show_bug.cgi?id=254868) on iOS
standalone and recreates the canvas gap under every page.

**Canonical contract:** [`docs/ux.md`](../../docs/ux.md) → Native / PWA →
Viewport and keyboard (including the anti-patterns table).

**Code:** `index.html` (`html.standalone` + `height: 100vh`),
`src/lib/pwa/canvasColors.ts`, `useVisualViewportHeight.ts`.

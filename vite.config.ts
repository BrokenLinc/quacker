import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest keeps our hand-written SW (push, notificationclick,
      // inbox) and only injects the precache manifest into it.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // The app registers the SW itself so it can prompt before activating a
      // new version — see src/lib/pwa/useServiceWorkerUpdate.ts.
      injectRegister: false,
      registerType: 'prompt',
      // manifest.webmanifest and the iOS meta in index.html are hand-tuned.
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // iOS splash screens are large and only ever fetched at launch.
        globIgnores: ['**/splash/**'],
      },
      // Keep /sw.js present in dev so the push opt-in switch is testable
      // locally; see AGENTS.md for the local push flow.
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
        suppressWarnings: true,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1600,
  },
  resolve: {
    alias: [{ find: /@@(.*)/, replacement: '/src/$1' }],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

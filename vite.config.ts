import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

// Tailwind v4 via the official Vite plugin — no postcss.config, no content globs.
// CRXJS handles MV3 bundling (service worker, content scripts, popup HTML).
export default defineConfig({
  plugins: [react(), tailwind(), crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Deterministic filenames make Chrome Web Store review diffs cleaner.
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
});

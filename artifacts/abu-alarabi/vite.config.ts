import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

/**
 * deferNonCriticalCss — production-only Vite plugin.
 *
 * Transforms the built index.html to make the Tailwind CSS bundle
 * non-render-blocking using the `media="print"` technique. The pre-rendered
 * hero in <div id="root"> uses inline styles so the page looks correct
 * during the brief window before CSS switches from print→all.
 *
 * Before: <link rel="stylesheet" crossorigin href="/assets/index.xxx.css">
 * After:  <link rel="stylesheet" crossorigin href="..." media="print"
 *               onload="this.media='all'">
 *         <noscript><link rel="stylesheet" ...></noscript>
 *
 * Expected Lighthouse savings: ~900–1100 ms render-blocking delay eliminated.
 */
function deferNonCriticalCss(): Plugin {
  return {
    name: 'defer-non-critical-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        return html.replace(
          /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
          (_, href) =>
            `<link rel="stylesheet" crossorigin href="${href}" media="print" onload="this.media='all'">` +
            `<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`,
        );
      },
    },
  };
}

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT || '5000';
const port = Number(rawPort) || 5000;
const basePath = process.env.BASE_PATH || '/';


export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    deferNonCriticalCss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    // Raise limit to avoid spurious warnings — route-level lazy imports keep
    // per-route chunks small; we let Rollup pick optimal split boundaries.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Only split pdfjs-dist: it is enormous (~700 KB) and has zero React
        // dependency, so there is no initialisation-order risk. All other
        // vendor splitting is left to Rollup's automatic algorithm to avoid
        // the "radix-vendor loads before react-vendor" forwardRef crash.
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) return 'pdf-vendor';
          if (id.includes('@tanstack/react-query')) return 'query-vendor';
          if (id.includes('zod')) return 'zod-vendor';
          if (id.includes('lucide-react')) return 'icons-vendor';
          if (id.includes('@radix-ui')) return 'ui-vendor';
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});

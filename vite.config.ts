import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// GitHub Pages project sites live under /<repo>/. The deploy workflow sets
// BASE_PATH from the repository name; locally we default to the same value.
const base = process.env.BASE_PATH ?? '/salary-tracker/';

/**
 * Production-only helpers for GitHub Pages:
 * - 404.html is a copy of index.html, so deep links / refreshes boot the SPA.
 * - sw.js is generated with the hashed asset list for offline precaching.
 */
function pagesAndServiceWorker(): Plugin {
  return {
    name: 'pages-and-sw',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html');
      const precache = ['./', ...files, 'manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
      const version = createHash('sha1').update(files.sort().join('|')).digest('hex').slice(0, 10);
      const template = readFileSync(new URL('./sw/sw.template.js', import.meta.url), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', version)
          .replace('__PRECACHE__', JSON.stringify(precache)),
      });
      const index = bundle['index.html'];
      if (index && index.type === 'asset') {
        this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
      }
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), pagesAndServiceWorker()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
  },
  build: {
    target: 'es2020',
    cssMinify: true,
    reportCompressedSize: true,
  },
});

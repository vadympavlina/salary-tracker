/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// GitHub Pages project sites live under /<repo>/. The deploy workflow sets
// BASE_PATH from the repository name; locally we default to the same value.
const base = process.env.BASE_PATH ?? '/salary-tracker/';

/** Content hash of everything in public/ (icons, splash screens, manifest). */
function publicHash(): string {
  const hash = createHash('sha1');
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else hash.update(name).update(readFileSync(p));
    }
  };
  walk(new URL('./public', import.meta.url).pathname);
  return hash.digest('hex').slice(0, 8);
}

/**
 * Production-only helpers for GitHub Pages:
 * - 404.html is a copy of index.html, so deep links / refreshes boot the SPA.
 * - sw.js is generated with the hashed asset list for offline precaching.
 */
function pagesAndServiceWorker(): Plugin {
  const assetsVersion = publicHash();
  return {
    name: 'pages-and-sw',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html');
      const precache = ['./', ...files];
      // Changes whenever code OR any icon/splash/manifest changes, so the SW (and its cache) refreshes.
      const version = createHash('sha1').update(files.sort().join('|')).update(assetsVersion).digest('hex').slice(0, 10);
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
  // Preact with its React-compatible layer (aliases react → preact/compat): the same
  // components ship ~60 KB less JavaScript (gzip) than React.
  plugins: [preact(), pagesAndServiceWorker()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
  build: {
    target: 'es2020',
    cssMinify: true,
    reportCompressedSize: true,
  },
});

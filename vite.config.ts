/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Relative asset paths: the same build works on its own domain (salary.edvault.online)
// and under a sub-folder (vadympavlina.github.io/salary-tracker/). BASE_PATH overrides it.
const base = process.env.BASE_PATH ?? './';

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
 * GitHub Pages answers unknown paths with 404.html. Old path-style links (/history/abc,
 * /salary-tracker/settings) are sent to the hash route of the app folder they belong to.
 * A copy of index.html can't do this: its relative ./assets paths break one folder deeper.
 */
const NOT_FOUND_HTML = `<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>Зарплата</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><script>
(function () {
  var p = location.pathname, m = p.match(/\\/(calculate|history|analytics|settings)(\\/.*)?$/);
  if (m) location.replace(p.slice(0, m.index) + '/#' + p.slice(m.index).replace(/\\/+$/, '') + location.search);
  else {
    var up = p.replace(/\\/[^/]*\\/?$/, '/') || '/';
    if (up !== p) location.replace(up); // one folder up; stops at / (never loops)
  }
})();
</script></head><body></body></html>
`;

/**
 * Production-only helpers for GitHub Pages:
 * - 404.html forwards legacy path links to the hash routes.
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
      const index = bundle['index.html'];
      const html = index && index.type === 'asset' ? String(index.source) : '';
      // Head-only edits (viewport, metas, theme script) must also produce a new SW, or offline users keep the old shell.
      const version = createHash('sha1').update(files.sort().join('|')).update(assetsVersion).update(html).digest('hex').slice(0, 10);
      const template = readFileSync(new URL('./sw/sw.template.js', import.meta.url), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', version)
          .replace('__PRECACHE__', JSON.stringify(precache)),
      });
      this.emitFile({ type: 'asset', fileName: '404.html', source: NOT_FOUND_HTML });
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

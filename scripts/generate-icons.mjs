// Generates every favicon / app icon from icons-src/icon.mjs.
// Usage: npm run icons   (needs Chromium for playwright-core and python3 + Pillow for .ico)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appIcon, faviconIcon, pinnedTabIcon } from '../icons-src/icon.mjs';

const pub = (p) => new URL(`../public/${p}`, import.meta.url).pathname;
mkdirSync(pub('icons'), { recursive: true });

// Vector favicon for modern browsers + Safari pinned tab (monochrome).
writeFileSync(pub('favicon.svg'), faviconIcon({ small: false }) + '\n');
writeFileSync(pub('icons/safari-pinned-tab.svg'), pinnedTabIcon() + '\n');

const tmp = join(tmpdir(), `salary-icons-${process.pid}`);
mkdirSync(tmp, { recursive: true });

// [file, size, svg, transparent background?]
const png = [
  // Browser tab: simplified wallet that stays legible at 16–32px.
  ['icons/favicon-16.png', 16, faviconIcon(), true],
  ['icons/favicon-32.png', 32, faviconIcon(), true],
  ['icons/app-192.png', 192, appIcon(), true],
  ['icons/app-512.png', 512, appIcon(), true],
  // iOS adds its own rounded mask and shows transparency as black — full bleed.
  // New file name on purpose: iOS remembers failed icon URLs, a fresh one is always fetched.
  ['icons/home-icon-180.png', 180, appIcon({ radius: 0 }), false],
  // Android adaptive icons: coin inside the 80% safe-zone circle, full bleed.
  ['icons/app-maskable-192.png', 192, appIcon({ radius: 0, scale: 0.8 }), false],
  ['icons/app-maskable-512.png', 512, appIcon({ radius: 0, scale: 0.8 }), false],
  // Windows start-menu tile.
  ['icons/mstile-150.png', 150, appIcon({ radius: 0, scale: 0.9 }), false],
  // Sources for favicon.ico
  [join(tmp, 'ico-16.png'), 16, faviconIcon(), true],
  [join(tmp, 'ico-32.png'), 32, faviconIcon(), true],
  [join(tmp, 'ico-48.png'), 48, faviconIcon({ small: false }), true],
];

const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [file, size, source, transparent] of png) {
  await page.setViewportSize({ width: size, height: size });
  const svg = source.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `);
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: file.startsWith('/') ? file : pub(file), omitBackground: transparent });
}
await browser.close();

// Multi-resolution favicon.ico (16/32/48), each size hand-tuned rather than downscaled.
execFileSync('python3', [
  '-I',
  '-c',
  `import sys
from PIL import Image
imgs=[Image.open(p).convert('RGBA') for p in sys.argv[2:]]
imgs[-1].save(sys.argv[1], format='ICO', sizes=[i.size for i in imgs], append_images=imgs[:-1])`,
  pub('favicon.ico'),
  join(tmp, 'ico-16.png'),
  join(tmp, 'ico-32.png'),
  join(tmp, 'ico-48.png'),
]);
rmSync(tmp, { recursive: true, force: true });

// Losslessly shrink PNGs.
execFileSync('python3', [
  '-I',
  '-c',
  `import sys
from PIL import Image
for p in sys.argv[1:]:
    Image.open(p).save(p, optimize=True)`,
  ...png.filter(([f]) => !f.startsWith('/')).map(([f]) => pub(f)),
]);
console.log('icons generated');

// Generates every favicon / app icon from icons-src/glyph.mjs.
// Usage: npm run icons   (needs Chromium for playwright-core and python3 + Pillow for .ico)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iconSvg, glyphPaths } from '../icons-src/glyph.mjs';

const pub = (p) => new URL(`../public/${p}`, import.meta.url).pathname;
mkdirSync(pub('icons'), { recursive: true });

// Vector favicon for modern browsers + Safari pinned tab (monochrome).
writeFileSync(pub('favicon.svg'), iconSvg({ inset: 0.04 }) + '\n');
writeFileSync(
  pub('icons/safari-pinned-tab.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${glyphPaths({ color: '#000', weight: 1.1 })}</svg>\n`,
);

const tmp = join(tmpdir(), `salary-icons-${process.pid}`);
mkdirSync(tmp, { recursive: true });

// [file, size, svg options, transparent corners?]
const png = [
  ['icons/favicon-16.png', 16, { weight: 1.4, radius: 96 }, true],
  ['icons/favicon-32.png', 32, { weight: 1.3, radius: 104 }, true],
  ['icons/icon-192.png', 192, { inset: 0.04 }, true],
  ['icons/icon-512.png', 512, { inset: 0.04 }, true],
  // iOS adds its own rounded mask and shows transparency as black — full bleed.
  ['icons/apple-touch-icon.png', 180, { radius: 0, inset: 0.08 }, false],
  // Android adaptive icons: glyph inside the 80% safe zone, full bleed.
  ['icons/icon-maskable-192.png', 192, { radius: 0, inset: 0.12 }, false],
  ['icons/icon-maskable-512.png', 512, { radius: 0, inset: 0.12 }, false],
  // Windows start-menu tile.
  ['icons/mstile-150.png', 150, { radius: 0, inset: 0.14 }, false],
  // Sources for favicon.ico
  [join(tmp, 'ico-16.png'), 16, { weight: 1.4, radius: 96 }, true],
  [join(tmp, 'ico-32.png'), 32, { weight: 1.3, radius: 104 }, true],
  [join(tmp, 'ico-48.png'), 48, { weight: 1.15, radius: 108 }, true],
];

const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [file, size, opts, transparent] of png) {
  await page.setViewportSize({ width: size, height: size });
  const svg = iconSvg(opts).replace('<svg ', `<svg width="${size}" height="${size}" `);
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

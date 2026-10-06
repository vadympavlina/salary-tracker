// Generates every favicon / app icon from icons-src/icon.mjs.
// Usage: npm run icons   (needs Chromium for playwright-core and python3 + Pillow for .ico)
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
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
  ['icons/icon-192.png', 192, appIcon(), true],
  ['icons/icon-512.png', 512, appIcon(), true],
  // iOS adds its own rounded mask and shows transparency as black — full bleed.
  ['icons/apple-touch-icon.png', 180, appIcon({ radius: 0 }), false],
  ['icons/apple-touch-icon-167.png', 167, appIcon({ radius: 0 }), false],
  ['icons/apple-touch-icon-152.png', 152, appIcon({ radius: 0 }), false],
  ['icons/apple-touch-icon-120.png', 120, appIcon({ radius: 0 }), false],
  // Android adaptive icons: coin inside the 80% safe-zone circle, full bleed.
  ['icons/icon-maskable-192.png', 192, appIcon({ radius: 0, scale: 0.8 }), false],
  ['icons/icon-maskable-512.png', 512, appIcon({ radius: 0, scale: 0.8 }), false],
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
// iOS launch screens (shown while a home-screen PWA starts). Portrait, one per device size.
// [CSS width, CSS height, pixel ratio]
const SPLASH = [
  [320, 568, 2], // iPhone SE 1st gen
  [375, 667, 2], // iPhone SE 2/3, 8
  [414, 736, 3], // iPhone 8 Plus
  [375, 812, 3], // iPhone X / XS / 11 Pro / 12–13 mini
  [414, 896, 2], // iPhone XR / 11
  [414, 896, 3], // iPhone XS Max / 11 Pro Max
  [390, 844, 3], // iPhone 12 / 13 / 14
  [428, 926, 3], // iPhone 12–13 Pro Max / 14 Plus
  [393, 852, 3], // iPhone 14 Pro / 15 / 15 Pro / 16
  [430, 932, 3], // iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  [402, 874, 3], // iPhone 16 Pro / 17 Pro
  [440, 956, 3], // iPhone 16 Pro Max / 17 Pro Max
  [744, 1133, 2], // iPad mini 6+
  [768, 1024, 2], // iPad 9.7" / mini 5
  [810, 1080, 2], // iPad 10.2"
  [820, 1180, 2], // iPad Air 10.9" / iPad 10th
  [834, 1194, 2], // iPad Pro 11"
  [1024, 1366, 2], // iPad Pro 12.9"
];
mkdirSync(pub('splash'), { recursive: true });
const splashLinks = [];
const splashFiles = [];
const dprPages = { 2: await browser.newPage({ deviceScaleFactor: 2 }), 3: await browser.newPage({ deviceScaleFactor: 3 }) };
for (const [w, h, r] of SPLASH) {
  const file = `splash/apple-splash-${w * r}x${h * r}.png`;
  const sp = dprPages[r];
  await sp.setViewportSize({ width: w, height: h });
  const icon = appIcon().replace('<svg ', '<svg width="100%" height="100%" ');
  const size = Math.round(Math.min(w, h) * 0.28);
  await sp.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;background:#F5F5FA;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(size * 0.18)}px;font-family:-apple-system,'SF Pro Display','Inter',system-ui,sans-serif">
    <div style="width:${size}px;height:${size}px;filter:drop-shadow(0 ${size * 0.08}px ${size * 0.16}px rgba(86,70,216,.28))">${icon}</div>
    <div style="font-size:${Math.round(size * 0.2)}px;font-weight:700;letter-spacing:-.02em;color:#15152B">Зарплата</div>
  </body></html>`);
  await sp.screenshot({ path: pub(file), scale: 'device', type: 'png' });
  splashFiles.push(pub(file));
  splashLinks.push(
    `<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="%BASE_URL%${file}" />`,
  );
}
// Keep index.html's launch-screen links in sync with the generated files.
const indexPath = new URL('../index.html', import.meta.url);
const html = readFileSync(indexPath, 'utf8');
const block = `<!-- splash:start (generated by npm run icons) -->\n    ${splashLinks.join('\n    ')}\n    <!-- splash:end -->`;
writeFileSync(indexPath, html.replace(/<!-- splash:start[\s\S]*?splash:end -->/, block));

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
  ...splashFiles,
]);
console.log('icons generated');

// Renders public/favicon.svg into the PNG icons used by the manifest / iOS.
// Usage: node scripts/generate-icons.mjs  (needs a Chromium for playwright-core)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'icon-maskable-512.png', size: 512, pad: 0.1, square: true },
  { file: 'apple-touch-icon.png', size: 180, pad: 0, square: true },
];

const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  // Maskable / apple icons get a full-bleed background so the OS mask never shows transparency.
  const inner = t.square ? svg.replace('rx="116"', 'rx="0"') : svg;
  const inset = Math.round(t.size * t.pad);
  await page.setContent(
    `<html><body style="margin:0;background:${t.square ? '#6A5AE8' : 'transparent'}">
      <div style="padding:${inset}px;width:${t.size - inset * 2}px;height:${t.size - inset * 2}px">${inner.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    </body></html>`,
  );
  await page.screenshot({ path: new URL(`../public/icons/${t.file}`, import.meta.url).pathname, omitBackground: !t.square });
}
await browser.close();
console.log('icons generated');

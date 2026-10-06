// Single source of truth for the app mark: a glossy 3D hryvnia coin.
// Used by scripts/generate-icons.mjs to render every favicon / app icon.

/** Hryvnia sign centered at (0,0), ~240 units tall. `w` thickens strokes for tiny sizes. */
function hryvnia(fill, w = 1) {
  const sw = 40 * w;
  const bar = 24 * w;
  return `
    <path d="M-62 -82c18-22 44-34 74-34 42 0 70 22 70 56 0 38-38 52-80 66-42 13-80 27-80 66 0 34 28 56 70 56 30 0 56-12 74-34"
      fill="none" stroke="${fill}" stroke-width="${sw}" stroke-linecap="round"/>
    <rect x="-94" y="${-24 - bar / 2}" width="188" height="${bar}" rx="${bar / 2}" fill="${fill}"/>
    <rect x="-94" y="${26 - bar / 2}" width="188" height="${bar}" rx="${bar / 2}" fill="${fill}"/>`;
}

const defs = `
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FBFAFF"/><stop offset="1" stop-color="#E4DFFD"/>
  </linearGradient>
  <radialGradient id="face" cx="0.32" cy="0.26" r="0.95">
    <stop offset="0" stop-color="#ADA2FF"/><stop offset="0.55" stop-color="#6E5DF0"/><stop offset="1" stop-color="#4A39CC"/>
  </radialGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4334B8"/><stop offset="1" stop-color="#2E2290"/>
  </linearGradient>
  <linearGradient id="bevel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#1D1470" stop-opacity=".35"/>
  </linearGradient>
  <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>`;

/**
 * The coin, centered at (0,0) with face radius 150.
 * `detail: false` drops blur/gloss for 16–32px renders where they only add mud.
 */
function coin({ weight = 1, detail = true, shadow = detail } = {}) {
  return `
    ${shadow ? `<ellipse cx="0" cy="168" rx="128" ry="22" fill="#3B2BB0" opacity=".28" filter="url(#shadow)"/>` : ''}
    <circle cx="0" cy="16" r="150" fill="url(#edge)"/>
    <circle cx="0" cy="0" r="150" fill="url(#face)"/>
    <circle cx="0" cy="0" r="146" fill="none" stroke="url(#bevel)" stroke-width="8"/>
    <circle cx="0" cy="0" r="118" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="5"/>
    ${detail ? `<g transform="translate(0 7) scale(0.6) translate(0 -6)" opacity=".5" filter="url(#soft)">${hryvnia('#24187A', weight)}</g>` : ''}
    <g transform="scale(0.6) translate(0 -6)">${hryvnia('#fff', weight)}</g>
    ${detail ? `<path d="M-128 -42 A132 132 0 0 1 96 -100 C40 -60 -40 -40 -128 -42Z" fill="url(#gloss)" opacity=".85"/>` : ''}`;
}

/**
 * Full app icon. `radius` 0 = full-bleed square (iOS / maskable / tiles);
 * `scale` shrinks the coin to fit a safe zone.
 */
export function appIcon({ radius = 114, scale = 1 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${defs}</defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <rect x="0" y="0" width="512" height="200" rx="${radius}" fill="#fff" opacity=".35"/>
  <g transform="translate(256 240) scale(${1.12 * scale})">${coin()}</g>
</svg>`;
}

/** Coin alone on transparent background — reads best in a browser tab at 16–48px. */
export function faviconIcon({ weight = 1.3, detail = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${defs}</defs>
  <g transform="translate(256 244) scale(1.6)">${coin({ weight, detail, shadow: false })}</g>
</svg>`;
}

/** Monochrome mask for Safari pinned tabs. */
export function pinnedTabIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="240" fill="#000"/>
  <g transform="translate(256 256) scale(1.4)">${hryvnia('#fff', 1.2)}</g>
</svg>`;
}

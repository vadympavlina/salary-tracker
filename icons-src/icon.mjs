// Single source of truth for the app mark: a white wallet on a lavender tile.
// Used by scripts/generate-icons.mjs to render every favicon / app icon.

const defs = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8E7FF8"/><stop offset="1" stop-color="#5544D6"/>
  </linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#ECE9FF"/>
  </linearGradient>
  <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".25"/>
  </linearGradient>
  <linearGradient id="clasp" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F3F1FF"/><stop offset="1" stop-color="#DCD6FD"/>
  </linearGradient>
  <radialGradient id="button" cx=".35" cy=".3" r=".8">
    <stop offset="0" stop-color="#9A8CFF"/><stop offset="1" stop-color="#4E3DD3"/>
  </radialGradient>
  <filter id="drop" x="-30%" y="-30%" width="160%" height="170%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="14"/>
    <feOffset dy="14"/>
    <feComponentTransfer><feFuncA type="linear" slope=".28"/></feComponentTransfer>
    <feFlood flood-color="#2A1C9C"/>
    <feComposite operator="in" in2="SourceAlpha"/>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

/**
 * The wallet, drawn on the 512 grid around the tile center.
 * `small` drops the peeking card, gloss and shadow and enlarges shapes for 16–48px.
 */
function wallet({ small = false } = {}) {
  if (small) {
    return `
    <g transform="translate(-6 0)">
      <rect x="76" y="150" width="340" height="236" rx="56" fill="#fff"/>
      <rect x="290" y="222" width="156" height="92" rx="46" fill="#DCD6FD"/>
      <circle cx="340" cy="268" r="24" fill="#5544D6"/>
    </g>`;
  }
  // Shifted so the optical center (body + clasp + card) sits in the middle of the tile.
  return `<g transform="translate(-14 -6)">
    <!-- card peeking out of the wallet -->
    <rect x="112" y="128" width="276" height="170" rx="34" fill="url(#card)" transform="rotate(-9 250 213)"/>
    <g filter="url(#drop)">
      <rect x="96" y="172" width="320" height="226" rx="52" fill="url(#body)"/>
    </g>
    <!-- stitched top edge -->
    <rect x="132" y="210" width="118" height="18" rx="9" fill="#6A5AE8" opacity=".22"/>
    <!-- clasp -->
    <rect x="302" y="248" width="142" height="82" rx="41" fill="url(#clasp)"/>
    <rect x="302" y="248" width="142" height="82" rx="41" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>
    <circle cx="350" cy="289" r="20" fill="url(#button)"/>
    <circle cx="344" cy="282" r="6" fill="#fff" opacity=".55"/>
  </g>`;
}

/**
 * Full app icon. `radius` 0 = full-bleed square (iOS / maskable / tiles);
 * `scale` shrinks the wallet to fit a safe zone; `small` = simplified art for tiny sizes.
 */
export function appIcon({ radius = 114, scale = 1, small = false } = {}) {
  const s = scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${defs}</defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  ${small ? '' : `<rect width="512" height="256" rx="${radius}" fill="url(#sheen)"/>`}
  <g transform="translate(${256 * (1 - s)} ${256 * (1 - s)}) scale(${s})">${wallet({ small })}</g>
</svg>`;
}

/** Browser-tab favicon: simplified wallet on a rounded tile, legible at 16–48px. */
export function faviconIcon({ small = true, radius = 120 } = {}) {
  return appIcon({ radius, small });
}

/** Monochrome mask for Safari pinned tabs. */
export function pinnedTabIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path fill="#000" fill-rule="evenodd" d="M128 150h256a56 56 0 0 1 56 56v24h-94a46 46 0 0 0 0 92h94v24a56 56 0 0 1-56 56H128a56 56 0 0 1-56-56V206a56 56 0 0 1 56-56Zm222 94a24 24 0 1 1 0 48 24 24 0 0 1 0-48Z"/>
</svg>`;
}

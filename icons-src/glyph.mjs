// Single source of truth for the app mark: a bold hryvnia sign on a lavender tile.
// `weight` thickens strokes for tiny sizes (16–32px) so the glyph stays legible.
export function glyphPaths({ color = '#fff', weight = 1 } = {}) {
  const sw = 46 * weight;
  const bar = 30 * weight;
  return `
  <g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M178 176c22-28 54-42 90-42 52 0 86 28 86 70 0 48-46 66-98 82-52 16-98 34-98 82 0 42 34 70 86 70 36 0 68-14 90-42"/>
  </g>
  <g fill="${color}">
    <rect x="138" y="${238 - bar / 2}" width="236" height="${bar}" rx="${bar / 2}"/>
    <rect x="138" y="${300 - bar / 2}" width="236" height="${bar}" rx="${bar / 2}"/>
  </g>`;
}

export function iconSvg({ radius = 112, weight = 1, inset = 0, background = 'gradient' } = {}) {
  // `inset` scales the glyph down (maskable icons need an 80% safe zone).
  const scale = 1 - inset * 2;
  const t = 256 * (1 - scale);
  const bg =
    background === 'gradient'
      ? `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8676F5"/><stop offset="1" stop-color="#5646D8"/></linearGradient></defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#g)"/>`
      : `<rect width="512" height="512" rx="${radius}" fill="${background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${bg}
  <g transform="translate(${t} ${t}) scale(${scale})">${glyphPaths({ weight })}</g>
</svg>`;
}

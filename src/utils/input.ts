/** Keeps digits and at most one decimal separator (2 decimals). Returns a canonical raw string ("31200.5"). */
export function sanitizeAmount(value: string, allowDecimal = true): string {
  let s = value.replace(/[^\d.,]/g, '').replace(/,/g, '.');
  if (!allowDecimal) return s.replace(/\./g, '').replace(/^0+(?=\d)/, '').slice(0, 9);
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  const [int, dec] = s.split('.');
  const intPart = int.replace(/^0+(?=\d)/, '').slice(0, 9);
  return dec !== undefined ? `${intPart || '0'}.${dec}` : intPart;
}

/** "31200.5" → "31 200,5" for display. */
export function groupAmount(raw: string): string {
  if (!raw) return '';
  const [int, dec] = raw.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec !== undefined ? `${grouped},${dec}` : grouped;
}

export function toNumber(raw: string): number {
  if (!raw) return 0;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function fromNumber(n: number | undefined): string {
  if (!n) return '';
  return String(Math.round(n * 100) / 100);
}

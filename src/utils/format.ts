const NBSP = ' ';

const intFmt = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Groups thousands with a non-breaking space: 28450 → "28 450". */
export function formatNumber(value: number, decimals = false): string {
  const n = Number.isFinite(value) ? value : 0;
  // Normalise any locale space variant to a plain NBSP so output is stable everywhere.
  return (decimals ? decFmt : intFmt).format(n).replace(/[\s ]/g, NBSP);
}

/** 28450 → "28 450 ₴"; keeps kopecks only when present. */
export function formatUAH(value: number, opts: { sign?: boolean } = {}): string {
  const n = Number.isFinite(value) ? value : 0;
  const hasFraction = Math.round(Math.abs(n) * 100) % 100 !== 0;
  const body = formatNumber(Math.abs(n), hasFraction);
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  return `${sign}${body}${NBSP}₴`;
}

/** Compact axis labels: 28450 → "28k". */
export function formatCompact(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`.replace('.0k', 'k');
  return String(Math.round(value));
}

export function formatPercent(value: number, sign = true): string {
  const s = sign && value > 0 ? '+' : value < 0 ? '−' : '';
  return `${s}${Math.abs(Math.round(value))}%`;
}

/** Ukrainian plural: plural(5, ['пара','пари','пар']) → 'пар'. */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

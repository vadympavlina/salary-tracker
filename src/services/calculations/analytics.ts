import type { SalaryRecord } from '../../types/salary';
import { calculateSalary } from './salaryCalculator';

export interface MonthPoint {
  period: string;
  /** Earned ("Всього нараховано"). */
  gross: number;
  /** "На руки". */
  net: number;
  pairs: number;
  videos: number;
  pairIncome: number;
  videoIncome: number;
  extraIncome: number;
}

export interface SeriesStats {
  total: number;
  average: number;
  max: number;
  maxPeriod: string | null;
}

/** Chronological (oldest → newest) monthly points for charts. */
export function buildMonthlySeries(records: SalaryRecord[], limit = 12): MonthPoint[] {
  return [...records]
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-limit)
    .map((r) => {
      const c = calculateSalary(r);
      return {
        period: r.period,
        gross: c.grossIncome,
        net: c.netIncome,
        pairs: c.pairs,
        videos: c.videos,
        pairIncome: c.pairIncome,
        videoIncome: c.videoIncome,
        extraIncome: c.extraIncome,
      };
    });
}

export function seriesStats(points: MonthPoint[], pick: (p: MonthPoint) => number): SeriesStats {
  if (!points.length) return { total: 0, average: 0, max: 0, maxPeriod: null };
  let total = 0;
  let max = -Infinity;
  let maxPeriod: string | null = null;
  for (const p of points) {
    const v = pick(p);
    total += v;
    if (v > max) {
      max = v;
      maxPeriod = p.period;
    }
  }
  return { total, average: total / points.length, max, maxPeriod };
}

export interface StructureSlice {
  key: 'pairs' | 'videos' | 'extra';
  label: string;
  value: number;
  percent: number;
}

/** Share of each income source across the given months. */
export function incomeStructure(points: MonthPoint[]): StructureSlice[] {
  const pairs = points.reduce((s, p) => s + p.pairIncome, 0);
  const videos = points.reduce((s, p) => s + p.videoIncome, 0);
  const extra = points.reduce((s, p) => s + p.extraIncome, 0);
  const total = pairs + videos + extra;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  return [
    { key: 'videos' as const, label: 'Відео', value: videos, percent: pct(videos) },
    { key: 'pairs' as const, label: 'Пари', value: pairs, percent: pct(pairs) },
    { key: 'extra' as const, label: 'Додаткові', value: extra, percent: pct(extra) },
  ].filter((s) => s.value > 0);
}

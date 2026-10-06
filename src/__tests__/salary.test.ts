import { describe, expect, it } from 'vitest';
import { calculateSalary, getPaymentStatus, percentChange } from '../services/calculations/salaryCalculator';
import { buildMonthlySeries, incomeStructure, seriesStats } from '../services/calculations/analytics';
import { createSalaryStorage, parseImport, buildExport, ImportError } from '../services/storage/salaryStorage';
import type { StorageAdapter } from '../services/storage/storageAdapter';
import type { SalaryInput } from '../types/salary';
import { formatUAH } from '../utils/format';
import { groupAmount, sanitizeAmount } from '../utils/input';
import { shiftPeriod, formatPeriod } from '../utils/period';
import { DEMO_INPUTS } from '../data/demoRecords';

const base: SalaryInput = {
  period: '2026-10',
  pairs: 12,
  pairRate: 350,
  videos: 248,
  videoRate: 45,
  advance: 5000,
  additional: 1200,
  received: 10000,
  advanceMode: 'part',
  taxRate: 9,
};

describe('calculateSalary', () => {
  it('advance as part of salary', () => {
    const c = calculateSalary(base);
    expect(c.pairIncome).toBe(4200);
    expect(c.videoIncome).toBe(11160);
    expect(c.grossIncome).toBe(16560);
    expect(c.netIncome).toBe(16560);
    expect(c.expectedOnCard).toBe(11560);
    expect(c.totalReceived).toBe(15000);
    expect(c.remaining).toBe(1560);
    expect(c.cardDifference).toBe(-1560);
    expect(c.status).toBe('partial');
  });

  it('advance as extra income', () => {
    const c = calculateSalary({ ...base, advanceMode: 'extra' });
    expect(c.grossIncome).toBe(21560);
    expect(c.expectedOnCard).toBe(16560);
    expect(c.remaining).toBe(6560);
  });

  it('statuses', () => {
    expect(calculateSalary({ ...base, advance: 0, received: 0 }).status).toBe('pending');
    expect(calculateSalary({ ...base, received: 11560 }).status).toBe('paid');
    expect(calculateSalary({ ...base, received: 20000 }).remaining).toBe(0);
    expect(getPaymentStatus(0, 0)).toBe('paid');
  });

  it('ignores invalid values', () => {
    const c = calculateSalary({ ...base, pairs: -3, videos: NaN, advance: 0, received: 0, additional: 0 });
    expect(c.grossIncome).toBe(0);
  });

  it('tax is informational', () => {
    const c = calculateSalary({ ...base, taxRate: 9 });
    expect(c.netIncome).toBe(16560);
    expect(c.taxEstimate).toBeCloseTo((16560 * 9) / 91, 1);
  });

  it('percentChange', () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(100, undefined)).toBeNull();
  });

  it('demo data matches spec amounts', () => {
    const nets = DEMO_INPUTS.map((i) => calculateSalary(i).netIncome);
    expect(nets).toEqual([18420, 20850, 22110, 24320, 26780, 28450]);
    expect(calculateSalary(DEMO_INPUTS[3]).status).toBe('pending');
    expect(calculateSalary(DEMO_INPUTS[5]).status).toBe('paid');
  });
});

describe('analytics', () => {
  it('series + stats + structure', () => {
    const recs = DEMO_INPUTS.map((i, n) => ({ ...i, id: String(n), createdAt: '', updatedAt: '', status: 'paid' as const }));
    const pts = buildMonthlySeries(recs, 3);
    expect(pts.map((p) => p.period)).toEqual(['2026-08', '2026-09', '2026-10']);
    const s = seriesStats(pts, (p) => p.net);
    expect(s.max).toBe(28450);
    expect(s.maxPeriod).toBe('2026-10');
    const total = incomeStructure(pts).reduce((a, b) => a + b.percent, 0);
    expect(total).toBeCloseTo(100);
  });
});

describe('format', () => {
  it('formats hryvnia with space separators', () => {
    expect(formatUAH(28450)).toBe('28 450 ₴');
    expect(formatUAH(-2750)).toBe('−2 750 ₴');
    expect(formatUAH(2750, { sign: true })).toBe('+2 750 ₴');
    expect(formatUAH(45.5)).toBe('45,5 ₴');
  });
  it('input sanitising', () => {
    expect(sanitizeAmount('31 200')).toBe('31200');
    expect(sanitizeAmount('12,555')).toBe('12.55');
    expect(sanitizeAmount('007')).toBe('7');
    expect(sanitizeAmount('1.2.3')).toBe('1.23');
    expect(sanitizeAmount('12.5', false)).toBe('125');
    expect(groupAmount('31200.5')).toBe('31 200,5');
  });
  it('periods', () => {
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01');
    expect(formatPeriod('2026-10')).toBe('Жовтень 2026');
  });
});

function memoryAdapter(): StorageAdapter {
  const m = new Map<string, string>();
  return {
    async get(k) {
      const v = m.get(k);
      return v ? JSON.parse(v) : null;
    },
    async set(k, v) {
      m.set(k, JSON.stringify(v));
    },
    async remove(k) {
      m.delete(k);
    },
  };
}

describe('storage', () => {
  it('seeds demo once and round-trips export/import', async () => {
    const storage = createSalaryStorage(memoryAdapter());
    const first = await storage.load();
    expect(first.records).toHaveLength(6);
    expect(first.records[0].period).toBe('2026-10');
    expect(first.records.every((r) => r.isDemo)).toBe(true);
    await storage.saveRecords([]);
    expect((await storage.load()).records).toHaveLength(0); // no re-seed

    const json = JSON.stringify(buildExport(first));
    const imported = parseImport(json);
    expect(imported.records).toHaveLength(6);
    expect(imported.settings.pairRate).toBe(350);
  });

  it('rejects bad files', () => {
    expect(() => parseImport('nope')).toThrow(ImportError);
    expect(() => parseImport('{"app":"other","records":[]}')).toThrow(ImportError);
    expect(() => parseImport('{"records":[{"period":"bad"}]}')).toThrow(ImportError);
  });
});

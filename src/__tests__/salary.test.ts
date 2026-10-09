import { describe, expect, it } from 'vitest';
import { calculateSalary, getPaymentStatus, percentChange } from '../services/calculations/salaryCalculator';
import { buildMonthlySeries, incomeStructure, seriesStats } from '../services/calculations/analytics';
import { createSalaryStorage, parseImport, buildExport, ImportError, normalizeRecord } from '../services/storage/salaryStorage';
import type { StorageAdapter } from '../services/storage/storageAdapter';
import type { SalaryInput } from '../types/salary';
import { formatUAH } from '../utils/format';
import { groupAmount, sanitizeAmount } from '../utils/input';
import { shiftPeriod, formatPeriod } from '../utils/period';
import { SAMPLE_INPUTS } from '../../tests/fixtures/sampleMonths';

const base: SalaryInput = {
  period: '2026-10',
  pairItems: [{ count: 12, rate: 350 }],
  videoItems: [{ count: 248, rate: 45 }],
  advance: 5000,
  additional: 1200,
  received: 10000,
  cashReceived: 0,
  advanceMode: 'part',
};

describe('calculateSalary', () => {
  it('на руки = нараховано − аванс − картка', () => {
    const c = calculateSalary(base);
    expect(c.pairIncome).toBe(4200);
    expect(c.videoIncome).toBe(11160);
    expect(c.grossIncome).toBe(16560);
    expect(c.netIncome).toBe(1560);
    expect(c.totalReceived).toBe(15000);
    expect(c.remaining).toBe(1560);
    expect(c.status).toBe('partial');
  });

  it('cash in hand closes the month', () => {
    const c = calculateSalary({ ...base, cashReceived: 1000 });
    expect(c.remaining).toBe(560);
    expect(c.status).toBe('partial');
    const paid = calculateSalary({ ...base, cashReceived: 1560 });
    expect(paid.remaining).toBe(0);
    expect(paid.status).toBe('paid');
  });

  it('advance as extra income', () => {
    const c = calculateSalary({ ...base, advanceMode: 'extra' });
    expect(c.grossIncome).toBe(21560);
    expect(c.netIncome).toBe(6560);
    expect(c.remaining).toBe(6560);
  });

  it('statuses and overpayment', () => {
    expect(calculateSalary({ ...base, advance: 0, received: 0 }).status).toBe('pending');
    const over = calculateSalary({ ...base, received: 20000 });
    expect(over.netIncome).toBe(0);
    expect(over.remaining).toBe(0);
    expect(over.status).toBe('paid');
    expect(getPaymentStatus(0, 0)).toBe('paid');
  });

  it('ignores invalid values', () => {
    const c = calculateSalary({ ...base, pairItems: [{ count: -3, rate: 350 }], videoItems: [{ count: NaN, rate: 45 }], advance: 0, received: 0, additional: 0 });
    expect(c.grossIncome).toBe(0);
  });

  it('several rates in one month', () => {
    const c = calculateSalary({
      ...base,
      pairItems: [{ count: 8, rate: 350 }, { count: 4, rate: 400 }],
      videoItems: [{ count: 200, rate: 45 }, { count: 48, rate: 50 }],
    });
    expect(c.pairs).toBe(12);
    expect(c.videos).toBe(248);
    expect(c.pairIncome).toBe(2800 + 1600);
    expect(c.videoIncome).toBe(9000 + 2400);
  });

  it('migrates single pairs/pairRate records saved before multi-rate support', () => {
    const old = normalizeRecord({ period: '2026-09', pairs: 11, pairRate: 350, videos: 484, videoRate: 45, note: 'премія' });
    expect(old!.pairItems).toEqual([{ count: 11, rate: 350 }]);
    expect(old!.videoItems).toEqual([{ count: 484, rate: 45 }]);
    expect(old!.note).toBe('премія');
    expect(calculateSalary(old!).grossIncome).toBe(3850 + 21780);
  });

  it('keeps a short comment per rate line, trimmed and length-limited; drops empty ones', () => {
    const r = normalizeRecord({
      ...base,
      pairItems: [
        { count: 8, rate: 350, note: '  Група А  ' },
        { count: 4, rate: 400, note: '' },
        { count: 1, rate: 500, note: 'x'.repeat(80) },
      ],
    });
    expect(r!.pairItems[0]).toEqual({ count: 8, rate: 350, note: 'Група А' });
    expect(r!.pairItems[1]).toEqual({ count: 4, rate: 400 });
    expect(r!.pairItems[2].note).toHaveLength(40);
    expect(calculateSalary(r!).pairIncome).toBe(2800 + 1600 + 500);
  });

  it('ignores a legacy taxRate field from old saves', () => {
    const legacy = normalizeRecord({ ...base, taxRate: 9 });
    expect(legacy).not.toHaveProperty('taxRate');
    expect(calculateSalary(legacy!).grossIncome).toBe(16560);
  });

  it('percentChange', () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(100, undefined)).toBeNull();
  });

  it('sample months add up', () => {
    const gross = SAMPLE_INPUTS.map((i) => calculateSalary(i).grossIncome);
    expect(gross).toEqual([18420, 20850, 22110, 24320, 26780, 28450]);
    expect(calculateSalary(SAMPLE_INPUTS[3]).status).toBe('pending');
    expect(calculateSalary(SAMPLE_INPUTS[5]).status).toBe('paid');
  });
});

describe('analytics', () => {
  it('series + stats + structure', () => {
    const recs = SAMPLE_INPUTS.map((i, n) => ({ ...i, id: String(n), createdAt: '', updatedAt: '', status: 'paid' as const }));
    const pts = buildMonthlySeries(recs, 3);
    expect(pts.map((p) => p.period)).toEqual(['2026-08', '2026-09', '2026-10']);
    const s = seriesStats(pts, (p) => p.gross);
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
  it('starts empty with the real defaults (no demo data)', async () => {
    const a = memoryAdapter();
    const data = await createSalaryStorage(a).load();
    expect(data.records).toHaveLength(0);
    expect(data.settings).toMatchObject({ pairRate: 400, videoRate: 50, defaultAdvance: 0, defaultCard: 15961 });
    expect(await a.get('salary_meta')).toEqual({ schemaVersion: 3 });
  });

  it('migration drops old demo rows, keeps own months, swaps placeholder rates', async () => {
    const a = memoryAdapter();
    await a.set('salary_meta', { schemaVersion: 2, seeded: true });
    await a.set('salary_records', [
      { period: '2026-09', pairs: 1, pairRate: 350, isDemo: true },
      { period: '2026-10', pairs: 3, pairRate: 350, note: 'моє' },
    ]);
    await a.set('salary_settings', { pairRate: 350, videoRate: 45, theme: 'dark' });
    const data = await createSalaryStorage(a).load();
    expect(data.records.map((r) => r.period)).toEqual(['2026-10']);
    expect(data.records[0].note).toBe('моє');
    expect(data.settings).toMatchObject({ pairRate: 400, videoRate: 50, defaultCard: 15961, theme: 'dark' });

    // Custom rates the user set themselves are never touched.
    const b = memoryAdapter();
    await b.set('salary_meta', { schemaVersion: 2, seeded: true });
    await b.set('salary_settings', { pairRate: 380, videoRate: 45 });
    expect((await createSalaryStorage(b).load()).settings).toMatchObject({ pairRate: 380, videoRate: 45 });
  });

  it('round-trips export/import', async () => {
    const storage = createSalaryStorage(memoryAdapter());
    await storage.load();
    const { buildRecord } = await import('../services/storage/salaryStorage');
    await storage.saveRecords(SAMPLE_INPUTS.map((i) => buildRecord(i)));
    const loaded = await storage.load();
    expect(loaded.records).toHaveLength(6);
    expect(loaded.records[0].period).toBe('2026-10');

    const imported = parseImport(JSON.stringify(buildExport(loaded)));
    expect(imported.records).toHaveLength(6);
    expect(imported.settings.defaultCard).toBe(15961);
  });

  it('rejects bad files', () => {
    expect(() => parseImport('nope')).toThrow(ImportError);
    expect(() => parseImport('{"app":"other","records":[]}')).toThrow(ImportError);
    expect(() => parseImport('{"records":[{"period":"bad"}]}')).toThrow(ImportError);
  });
});

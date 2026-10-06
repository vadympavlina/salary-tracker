import { describe, expect, it } from 'vitest';
import { applyUpdates, mergeWithRemote, type LocalState } from '../services/cloud/merge';
import { buildRecord } from '../services/storage/salaryStorage';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../data/defaults';
import type { SalaryInput, SalaryRecord } from '../types/salary';

const EPOCH = '1970-01-01T00:00:00.000Z';
const input = (period: string, pairs: number): SalaryInput => ({
  period,
  pairItems: [{ count: pairs, rate: 400 }],
  videoItems: [{ count: 0, rate: 50 }],
  advance: 0,
  additional: 0,
  received: 15961,
  cashReceived: 0,
  advanceMode: 'part',
});
const rec = (period: string, pairs: number, at: string): SalaryRecord => ({ ...buildRecord(input(period, pairs)), updatedAt: at });
const local = (records: SalaryRecord[], extra: Partial<LocalState['sync']> = {}): LocalState => ({
  records,
  settings: DEFAULT_SETTINGS,
  profile: DEFAULT_PROFILE,
  sync: { tombstones: {}, settingsAt: EPOCH, profileAt: EPOCH, ...extra },
});

describe('mergeWithRemote', () => {
  it('first sign-in with an empty cloud uploads everything local', () => {
    const r = mergeWithRemote(local([rec('2026-10', 3, '2026-10-06T10:00:00Z')]), {});
    expect(r.localChanged).toBe(false);
    expect(Object.keys(r.updates).sort()).toEqual(['profile', 'records/2026-10', 'settings']);
  });

  it('a newer month from another device replaces the local one', () => {
    const remote = { records: { '2026-10': rec('2026-10', 9, '2026-10-06T12:00:00Z') } };
    const r = mergeWithRemote(local([rec('2026-10', 3, '2026-10-06T10:00:00Z')]), remote);
    expect(r.localChanged).toBe(true);
    expect(r.local.records[0].pairItems[0].count).toBe(9);
    expect(Object.keys(r.updates).filter((k) => k.startsWith('records/'))).toEqual([]);
  });

  it('a newer local edit is uploaded, the older cloud copy is ignored', () => {
    const remote = { records: { '2026-10': rec('2026-10', 1, '2026-10-06T09:00:00Z') } };
    const r = mergeWithRemote(local([rec('2026-10', 5, '2026-10-06T10:00:00Z')]), remote);
    expect(r.localChanged).toBe(false);
    expect((r.updates['records/2026-10'] as SalaryRecord).pairItems[0].count).toBe(5);
  });

  it('months only in the cloud are downloaded', () => {
    const remote = { records: { '2026-09': rec('2026-09', 7, '2026-09-30T10:00:00Z') } };
    const r = mergeWithRemote(local([rec('2026-10', 5, '2026-10-06T10:00:00Z')]), remote);
    expect(r.local.records.map((x) => x.period)).toEqual(['2026-10', '2026-09']);
    expect(Object.keys(r.updates)).toContain('records/2026-10');
  });

  it('a deletion on another device removes the month here', () => {
    const remote = { records: { '2026-10': { deleted: true as const, updatedAt: '2026-10-06T12:00:00Z' } } };
    const r = mergeWithRemote(local([rec('2026-10', 5, '2026-10-06T10:00:00Z')]), remote);
    expect(r.local.records).toHaveLength(0);
    expect(r.local.sync.tombstones['2026-10']).toBe('2026-10-06T12:00:00Z');
  });

  it('a local deletion is uploaded as a tombstone', () => {
    const remote = { records: { '2026-10': rec('2026-10', 5, '2026-10-06T10:00:00Z') } };
    const r = mergeWithRemote(local([], { tombstones: { '2026-10': '2026-10-06T11:00:00Z' } }), remote);
    expect(r.updates['records/2026-10']).toEqual({ deleted: true, updatedAt: '2026-10-06T11:00:00Z' });
  });

  it('editing a month after it was deleted elsewhere brings it back', () => {
    const remote = { records: { '2026-10': { deleted: true as const, updatedAt: '2026-10-06T10:00:00Z' } } };
    const r = mergeWithRemote(local([rec('2026-10', 2, '2026-10-06T11:00:00Z')]), remote);
    expect(r.local.records).toHaveLength(1);
    expect((r.updates['records/2026-10'] as SalaryRecord).period).toBe('2026-10');
  });

  it('settings: the newer side wins; untouched local defaults never overwrite the cloud', () => {
    const remote = { settings: { data: { ...DEFAULT_SETTINGS, pairRate: 420 }, updatedAt: '2026-10-01T00:00:00Z' } };
    const r = mergeWithRemote(local([]), remote);
    expect(r.local.settings.pairRate).toBe(420);
    expect(r.updates.settings).toBeUndefined();

    const mine = mergeWithRemote({ ...local([], { settingsAt: '2026-10-05T00:00:00Z' }), settings: { ...DEFAULT_SETTINGS, pairRate: 450 } }, remote);
    expect((mine.updates.settings as { data: { pairRate: number } }).data.pairRate).toBe(450);
  });

  it('nothing to do when both sides match', () => {
    const r1 = rec('2026-10', 5, '2026-10-06T10:00:00Z');
    const first = mergeWithRemote(local([r1]), {});
    const remote = applyUpdates({}, first.updates);
    const again = mergeWithRemote(local([r1]), remote);
    expect(again.localChanged).toBe(false);
    expect(again.updates).toEqual({});
  });

  it('never sends undefined values (Firebase rejects them)', () => {
    const r = mergeWithRemote(local([{ ...rec('2026-10', 1, '2026-10-06T10:00:00Z'), note: undefined }]), {});
    expect(JSON.stringify(r.updates['records/2026-10'])).not.toContain('undefined');
    expect('note' in (r.updates['records/2026-10'] as object)).toBe(false);
  });
});

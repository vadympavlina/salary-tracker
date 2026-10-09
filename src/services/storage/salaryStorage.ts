import type { ExportPayload, RateLine, SalaryInput, SalaryProfile, SalaryRecord, SalarySettings } from '../../types/salary';
import type { SyncMeta } from '../cloud/types';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../../data/defaults';
import { calculateSalary } from '../calculations/salaryCalculator';
import { LocalStorageAdapter, type StorageAdapter } from './storageAdapter';

export const STORAGE_KEYS = {
  records: 'salary_records',
  settings: 'salary_settings',
  profile: 'salary_profile',
  meta: 'salary_meta',
  sync: 'salary_sync',
} as const;

/** Before anything was synced, local settings count as "very old": any cloud copy wins over them. */
const EPOCH = '1970-01-01T00:00:00.000Z';

export const SCHEMA_VERSION = 3;

interface Meta {
  schemaVersion: number;
}

export interface AppData {
  records: SalaryRecord[];
  settings: SalarySettings;
  profile: SalaryProfile;
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const num = (v: unknown, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Rate lines from storage; records saved before multi-rate support had a single pairs/pairRate pair. */
export const LINE_NOTE_MAX = 40;

function lines(items: unknown, legacyCount: unknown, legacyRate: unknown): RateLine[] {
  if (Array.isArray(items)) {
    const out = items
      .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
      .map((l) => {
        const note = typeof l.note === 'string' ? l.note.trim().slice(0, LINE_NOTE_MAX) : '';
        return note ? { count: num(l.count), rate: num(l.rate), note } : { count: num(l.count), rate: num(l.rate) };
      })
      .slice(0, 10);
    if (out.length) return out;
  }
  return [{ count: num(legacyCount), rate: num(legacyRate) }];
}

const isPeriod = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** Builds a full record (with derived status) from inputs. */
export function buildRecord(input: SalaryInput, existing?: SalaryRecord): SalaryRecord {
  const now = new Date().toISOString();
  return {
    ...input,
    id: existing?.id ?? uid(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    status: calculateSalary(input).status,
  };
}

/** Validates and repairs anything that comes from storage or an imported file. */
export function normalizeRecord(raw: unknown): SalaryRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isPeriod(r.period)) return null;
  const input: SalaryInput = {
    period: r.period,
    pairItems: lines(r.pairItems, r.pairs, r.pairRate),
    videoItems: lines(r.videoItems, r.videos, r.videoRate),
    advance: num(r.advance),
    additional: num(r.additional),
    received: num(r.received),
    cashReceived: num(r.cashReceived),
    advanceMode: r.advanceMode === 'extra' ? 'extra' : 'part',
    note: typeof r.note === 'string' ? r.note.slice(0, 500) : undefined,
  };
  const now = new Date().toISOString();
  return {
    ...input,
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
    status: calculateSalary(input).status,
  };
}

export function normalizeSettings(raw: unknown): SalarySettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    pairRate: num(s.pairRate, DEFAULT_SETTINGS.pairRate),
    videoRate: num(s.videoRate, DEFAULT_SETTINGS.videoRate),
    advanceMode: s.advanceMode === 'extra' ? 'extra' : 'part',
    defaultAdvance: num(s.defaultAdvance, DEFAULT_SETTINGS.defaultAdvance),
    defaultCard: num(s.defaultCard, DEFAULT_SETTINGS.defaultCard),
    theme: s.theme === 'dark' || s.theme === 'system' ? s.theme : 'light',
  };
}

export function normalizeProfile(raw: unknown): SalaryProfile {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, fb: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : fb);
  return { firstName: str(p.firstName, DEFAULT_PROFILE.firstName), fullName: str(p.fullName, DEFAULT_PROFILE.fullName) };
}

const sortRecords = (records: SalaryRecord[]) => [...records].sort((a, b) => b.period.localeCompare(a.period));

/**
 * Repository for everything the app persists. UI code never touches the
 * underlying storage — swap the adapter to move to Firebase later.
 */
export function createSalaryStorage(adapter: StorageAdapter = new LocalStorageAdapter()) {
  async function writeRecords(records: SalaryRecord[]) {
    const sorted = sortRecords(records);
    await adapter.set(STORAGE_KEYS.records, sorted);
    return sorted;
  }

  return {
    async load(): Promise<AppData> {
      const meta = await adapter.get<Meta>(STORAGE_KEYS.meta);
      if (!meta || meta.schemaVersion < SCHEMA_VERSION) {
        // v3: real data only. Drop the old demo rows (the user's own months stay)…
        const existing = await adapter.get<unknown[]>(STORAGE_KEYS.records);
        if (Array.isArray(existing)) {
          const own = existing.filter((r) => !(r && typeof r === 'object' && (r as { isDemo?: unknown }).isDemo === true));
          if (own.length !== existing.length) await adapter.set(STORAGE_KEYS.records, own);
        }
        // …and replace the old placeholder rates (350 / 45) with the real defaults.
        const s = await adapter.get<Record<string, unknown>>(STORAGE_KEYS.settings);
        if (s && s.pairRate === 350 && s.videoRate === 45) {
          await adapter.set(STORAGE_KEYS.settings, { ...s, pairRate: DEFAULT_SETTINGS.pairRate, videoRate: DEFAULT_SETTINGS.videoRate });
        }
        await adapter.set<Meta>(STORAGE_KEYS.meta, { schemaVersion: SCHEMA_VERSION });
      }
      const rawRecords = await adapter.get<unknown[]>(STORAGE_KEYS.records);
      const records = Array.isArray(rawRecords)
        ? rawRecords.map(normalizeRecord).filter((r): r is SalaryRecord => r !== null)
        : [];
      return {
        records: sortRecords(records),
        settings: normalizeSettings(await adapter.get(STORAGE_KEYS.settings)),
        profile: normalizeProfile(await adapter.get(STORAGE_KEYS.profile)),
      };
    },

    saveRecords: writeRecords,

    async saveSettings(settings: SalarySettings) {
      await adapter.set(STORAGE_KEYS.settings, settings);
    },

    async saveProfile(profile: SalaryProfile) {
      await adapter.set(STORAGE_KEYS.profile, profile);
    },

    async loadSync(): Promise<SyncMeta> {
      const s = await adapter.get<Partial<SyncMeta>>(STORAGE_KEYS.sync);
      return {
        tombstones: s?.tombstones && typeof s.tombstones === 'object' ? s.tombstones : {},
        settingsAt: typeof s?.settingsAt === 'string' ? s.settingsAt : EPOCH,
        profileAt: typeof s?.profileAt === 'string' ? s.profileAt : EPOCH,
      };
    },

    async saveSync(sync: SyncMeta) {
      await adapter.set(STORAGE_KEYS.sync, sync);
    },

    /** Removes this device's copy only (used on sign-out; the cloud keeps everything). */
    async wipeLocal() {
      for (const key of [STORAGE_KEYS.records, STORAGE_KEYS.settings, STORAGE_KEYS.profile, STORAGE_KEYS.sync]) await adapter.remove(key);
    },

    async clearAll() {
      await adapter.set(STORAGE_KEYS.records, []);
      await adapter.remove(STORAGE_KEYS.settings);
      await adapter.remove(STORAGE_KEYS.profile);
    },
  };
}

export type SalaryStorage = ReturnType<typeof createSalaryStorage>;

export const salaryStorage = createSalaryStorage();

// ---------- Export / import ----------

export function buildExport(data: AppData): ExportPayload {
  return {
    app: 'salary-tracker',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records: data.records,
    settings: data.settings,
    profile: data.profile,
  };
}

export class ImportError extends Error {}

/** Parses and validates an exported JSON file. Throws ImportError with a user-facing message. */
export function parseImport(text: string): AppData {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportError('Файл пошкоджений або не є JSON.');
  }
  if (!json || typeof json !== 'object') throw new ImportError('Невірний формат файлу.');
  const obj = json as Record<string, unknown>;
  // Accept both a full export and a bare array of records.
  const rawRecords = Array.isArray(json) ? json : obj.records;
  if (!Array.isArray(rawRecords)) throw new ImportError('У файлі немає розрахунків.');
  if (!Array.isArray(json) && obj.app !== undefined && obj.app !== 'salary-tracker') {
    throw new ImportError('Цей файл створено іншим застосунком.');
  }
  const records = rawRecords.map(normalizeRecord).filter((r): r is SalaryRecord => r !== null);
  if (rawRecords.length > 0 && records.length === 0) throw new ImportError('Не вдалося прочитати жодного запису.');
  return {
    records: sortRecords(records),
    settings: normalizeSettings(Array.isArray(json) ? undefined : obj.settings),
    profile: normalizeProfile(Array.isArray(json) ? undefined : obj.profile),
  };
}

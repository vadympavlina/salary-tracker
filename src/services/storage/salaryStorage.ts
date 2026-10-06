import type { ExportPayload, SalaryInput, SalaryProfile, SalaryRecord, SalarySettings } from '../../types/salary';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../../data/defaults';
import { DEMO_INPUTS } from '../../data/demoRecords';
import { calculateSalary } from '../calculations/salaryCalculator';
import { LocalStorageAdapter, type StorageAdapter } from './storageAdapter';

export const STORAGE_KEYS = {
  records: 'salary_records',
  settings: 'salary_settings',
  profile: 'salary_profile',
  meta: 'salary_meta',
} as const;

export const SCHEMA_VERSION = 1;

interface Meta {
  schemaVersion: number;
  seeded: boolean;
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
    // Once the user edits a demo row it becomes their own data.
    isDemo: undefined,
  };
}

/** Validates and repairs anything that comes from storage or an imported file. */
export function normalizeRecord(raw: unknown): SalaryRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isPeriod(r.period)) return null;
  const input: SalaryInput = {
    period: r.period,
    pairs: num(r.pairs),
    pairRate: num(r.pairRate),
    videos: num(r.videos),
    videoRate: num(r.videoRate),
    advance: num(r.advance),
    additional: num(r.additional),
    received: num(r.received),
    advanceMode: r.advanceMode === 'extra' ? 'extra' : 'part',
    taxRate: Math.min(num(r.taxRate, DEFAULT_SETTINGS.taxRate), 99),
    note: typeof r.note === 'string' ? r.note.slice(0, 500) : undefined,
  };
  const now = new Date().toISOString();
  return {
    ...input,
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
    status: calculateSalary(input).status,
    isDemo: r.isDemo === true ? true : undefined,
  };
}

export function normalizeSettings(raw: unknown): SalarySettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    pairRate: num(s.pairRate, DEFAULT_SETTINGS.pairRate),
    videoRate: num(s.videoRate, DEFAULT_SETTINGS.videoRate),
    taxRate: Math.min(num(s.taxRate, DEFAULT_SETTINGS.taxRate), 99),
    advanceMode: s.advanceMode === 'extra' ? 'extra' : 'part',
    defaultAdvance: num(s.defaultAdvance, DEFAULT_SETTINGS.defaultAdvance),
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
      if (!meta?.seeded) {
        // First launch: seed demo data so the app doesn't look empty.
        const records = DEMO_INPUTS.map((i) => ({ ...buildRecord(i), isDemo: true }));
        await writeRecords(records);
        await adapter.set<Meta>(STORAGE_KEYS.meta, { schemaVersion: SCHEMA_VERSION, seeded: true });
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

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SalaryInput, SalaryProfile, SalaryRecord, SalarySettings } from '../types/salary';
import { buildExport, buildRecord, salaryStorage, type AppData } from '../services/storage/salaryStorage';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../data/defaults';
import { currentPeriod } from '../utils/period';

/** A calculation in progress (between the form and the result screen). */
export interface Draft {
  input: SalaryInput;
  editId?: string;
}

const DRAFT_KEY = 'salary_draft';

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(d: Draft | null) {
  try {
    if (d) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* private mode — draft just won't survive a reload */
  }
}

interface SalaryStore extends AppData {
  ready: boolean;
  draft: Draft | null;
  setDraft: (d: Draft | null) => void;
  getRecord: (id: string) => SalaryRecord | undefined;
  findByPeriod: (period: string) => SalaryRecord | undefined;
  /** Creates or updates a record. One record per month: saving over an existing month replaces it. */
  saveRecord: (input: SalaryInput, editId?: string) => Promise<SalaryRecord>;
  /** +1 / −1 pair or video on the current month (creates the month if needed). */
  bumpCurrentMonth: (kind: 'pairs' | 'videos', delta: number) => Promise<SalaryRecord>;
  deleteRecord: (id: string) => Promise<SalaryRecord | undefined>;
  restoreRecord: (record: SalaryRecord) => Promise<void>;
  updateSettings: (patch: Partial<SalarySettings>) => Promise<void>;
  updateProfile: (patch: Partial<SalaryProfile>) => Promise<void>;
  clearAll: () => Promise<void>;
  importData: (data: AppData, mode: 'replace' | 'merge') => Promise<number>;
  exportJson: () => string;
}

const Ctx = createContext<SalaryStore | null>(null);

export function SalaryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({ records: [], settings: DEFAULT_SETTINGS, profile: DEFAULT_PROFILE });
  const [ready, setReady] = useState(false);
  const [draft, setDraftState] = useState<Draft | null>(readDraft);
  // Always-fresh copy for async actions without re-creating callbacks.
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    salaryStorage.load().then((d) => {
      setData(d);
      setReady(true);
    });
    // Another tab / the installed app changed the data → pick it up here too.
    const onStorage = (e: StorageEvent) => {
      if (e.key && !e.key.startsWith('salary_')) return;
      salaryStorage.load().then((d) => {
        ref.current = d;
        setData(d);
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setDraft = useCallback((d: Draft | null) => {
    setDraftState(d);
    writeDraft(d);
  }, []);

  // Writes run one after another and update `ref` immediately, so rapid taps (+1 +1 +1)
  // each see the previous result instead of a stale render.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const serial = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task, task);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  const commitRecords = useCallback(async (records: SalaryRecord[]) => {
    const sorted = await salaryStorage.saveRecords(records);
    ref.current = { ...ref.current, records: sorted };
    setData((d) => ({ ...d, records: sorted }));
  }, []);

  const saveRecord = useCallback(
    async (input: SalaryInput, editId?: string) => {
      const records = ref.current.records;
      const existing = (editId && records.find((r) => r.id === editId)) || records.find((r) => r.period === input.period);
      const record = buildRecord(input, existing);
      // Drop the edited row and any other row occupying the same month.
      const rest = records.filter((r) => r.id !== record.id && r.period !== record.period);
      await commitRecords([...rest, record]);
      return record;
    },
    [commitRecords],
  );

  const bumpCurrentMonth = useCallback(
    (kind: 'pairs' | 'videos', delta: number) =>
      serial(async () => {
        const { records, settings } = ref.current;
        const period = currentPeriod();
        const existing = records.find((r) => r.period === period);
        const base: SalaryInput = existing ?? {
          period,
          pairItems: [{ count: 0, rate: settings.pairRate }],
          videoItems: [{ count: 0, rate: settings.videoRate }],
          advance: settings.defaultAdvance,
          additional: 0,
          received: settings.defaultCard,
          cashReceived: 0,
          advanceMode: settings.advanceMode,
        };
        const key = kind === 'pairs' ? 'pairItems' : 'videoItems';
        const lines = base[key].map((l) => ({ ...l }));
        // +1 goes to the latest rate; −1 comes off the latest line that still has something.
        const idx = delta > 0 ? lines.length - 1 : lines.map((l) => l.count > 0).lastIndexOf(true);
        if (idx >= 0) lines[idx].count = Math.max(0, lines[idx].count + delta);
        const record = buildRecord({ ...base, [key]: lines }, existing);
        await commitRecords([...records.filter((r) => r.id !== record.id), record]);
        return record;
      }),
    [serial, commitRecords],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      const removed = ref.current.records.find((r) => r.id === id);
      await commitRecords(ref.current.records.filter((r) => r.id !== id));
      return removed;
    },
    [commitRecords],
  );

  const restoreRecord = useCallback(
    async (record: SalaryRecord) => {
      await commitRecords([...ref.current.records.filter((r) => r.period !== record.period), record]);
    },
    [commitRecords],
  );

  const updateSettings = useCallback(async (patch: Partial<SalarySettings>) => {
    const settings = { ...ref.current.settings, ...patch };
    await salaryStorage.saveSettings(settings);
    setData((d) => ({ ...d, settings }));
  }, []);

  const updateProfile = useCallback(async (patch: Partial<SalaryProfile>) => {
    const profile = { ...ref.current.profile, ...patch };
    await salaryStorage.saveProfile(profile);
    setData((d) => ({ ...d, profile }));
  }, []);

  const clearAll = useCallback(async () => {
    await salaryStorage.clearAll();
    setData({ records: [], settings: DEFAULT_SETTINGS, profile: DEFAULT_PROFILE });
    setDraft(null);
  }, [setDraft]);

  const importData = useCallback(
    async (incoming: AppData, mode: 'replace' | 'merge') => {
      let records = incoming.records;
      if (mode === 'merge') {
        // Imported months win over existing ones.
        const periods = new Set(incoming.records.map((r) => r.period));
        records = [...ref.current.records.filter((r) => !periods.has(r.period)), ...incoming.records];
      }
      await commitRecords(records);
      if (mode === 'replace') {
        await salaryStorage.saveSettings(incoming.settings);
        await salaryStorage.saveProfile(incoming.profile);
        setData((d) => ({ ...d, settings: incoming.settings, profile: incoming.profile }));
      }
      return incoming.records.length;
    },
    [commitRecords],
  );

  const value = useMemo<SalaryStore>(
    () => ({
      ...data,
      ready,
      draft,
      setDraft,
      getRecord: (id) => data.records.find((r) => r.id === id),
      findByPeriod: (period) => data.records.find((r) => r.period === period),
      saveRecord,
      bumpCurrentMonth,
      deleteRecord,
      restoreRecord,
      updateSettings,
      updateProfile,
      clearAll,
      importData,
      exportJson: () => JSON.stringify(buildExport(ref.current), null, 2),
    }),
    [data, ready, draft, setDraft, saveRecord, bumpCurrentMonth, deleteRecord, restoreRecord, updateSettings, updateProfile, clearAll, importData],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSalary(): SalaryStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSalary must be used inside SalaryProvider');
  return ctx;
}

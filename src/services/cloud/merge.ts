import type { SalaryProfile, SalaryRecord, SalarySettings } from '../../types/salary';
import { normalizeProfile, normalizeRecord, normalizeSettings } from '../storage/salaryStorage';
import type { CloudUpdates, RemoteData, RemoteEntry, SyncMeta } from './types';

export interface LocalState {
  records: SalaryRecord[];
  settings: SalarySettings;
  profile: SalaryProfile;
  sync: SyncMeta;
}

export interface MergeResult {
  /** New local state (same object when nothing changed locally). */
  local: LocalState;
  localChanged: boolean;
  /** What to write to the cloud so it catches up with local edits. */
  updates: CloudUpdates;
}

const isTombstone = (e: RemoteEntry | undefined): e is { deleted: true; updatedAt: string } =>
  !!e && (e as { deleted?: unknown }).deleted === true;

/** Firebase rejects `undefined` values; strip them. */
export const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/**
 * Two-way, last-write-wins merge of local data with the cloud copy.
 * - Months are matched by period; the side with the newer `updatedAt` wins
 *   (a deletion is a tombstone with its own timestamp).
 * - Settings / profile likewise by their last-changed time.
 * Pure function: used on first sign-in, on every remote change and after local edits.
 */
export function mergeWithRemote(local: LocalState, remote: RemoteData): MergeResult {
  const updates: CloudUpdates = {};
  let localChanged = false;

  const byPeriod = new Map(local.records.map((r) => [r.period, r]));
  const tombstones = { ...local.sync.tombstones };
  const remoteRecords = remote.records ?? {};
  const periods = new Set([...byPeriod.keys(), ...Object.keys(tombstones), ...Object.keys(remoteRecords)]);

  for (const period of periods) {
    const mine: RemoteEntry | undefined = byPeriod.get(period) ?? (tombstones[period] ? { deleted: true, updatedAt: tombstones[period] } : undefined);
    const theirs = remoteRecords[period];
    const mineAt = mine?.updatedAt ?? '';
    const theirsAt = theirs?.updatedAt ?? '';

    if (mine && (!theirs || mineAt > theirsAt)) {
      // Local is newer (or the cloud never saw it) → upload.
      updates[`records/${period}`] = clean(mine);
    } else if (theirs && (!mine || theirsAt > mineAt)) {
      // Cloud is newer → apply locally.
      if (isTombstone(theirs)) {
        if (byPeriod.has(period)) byPeriod.delete(period);
        tombstones[period] = theirs.updatedAt;
      } else {
        const rec = normalizeRecord(theirs);
        if (!rec) continue;
        byPeriod.set(period, { ...rec, updatedAt: theirs.updatedAt });
        delete tombstones[period];
      }
      localChanged = true;
    }
  }

  let settings = local.settings;
  let settingsAt = local.sync.settingsAt;
  if (remote.settings && (!settingsAt || remote.settings.updatedAt > settingsAt)) {
    settings = normalizeSettings(remote.settings.data);
    settingsAt = remote.settings.updatedAt;
    localChanged = true;
  } else if (settingsAt && (!remote.settings || settingsAt > remote.settings.updatedAt)) {
    updates.settings = clean({ data: settings, updatedAt: settingsAt });
  }

  let profile = local.profile;
  let profileAt = local.sync.profileAt;
  if (remote.profile && (!profileAt || remote.profile.updatedAt > profileAt)) {
    profile = normalizeProfile(remote.profile.data);
    profileAt = remote.profile.updatedAt;
    localChanged = true;
  } else if (profileAt && (!remote.profile || profileAt > remote.profile.updatedAt)) {
    updates.profile = clean({ data: profile, updatedAt: profileAt });
  }

  if (!localChanged) return { local, localChanged, updates };
  return {
    local: {
      records: [...byPeriod.values()].sort((a, b) => b.period.localeCompare(a.period)),
      settings,
      profile,
      sync: { tombstones, settingsAt, profileAt },
    },
    localChanged,
    updates,
  };
}

/** Applies a path-keyed update to a RemoteData copy (keeps the in-memory cloud mirror current). */
export function applyUpdates(remote: RemoteData, updates: CloudUpdates): RemoteData {
  const next: RemoteData = { ...remote, records: { ...(remote.records ?? {}) } };
  for (const [path, value] of Object.entries(updates)) {
    const [head, key] = path.split('/');
    if (head === 'records' && key) {
      if (value === null) delete next.records![key];
      else next.records![key] = value as RemoteEntry;
    } else if (head === 'settings') next.settings = value as RemoteData['settings'];
    else if (head === 'profile') next.profile = value as RemoteData['profile'];
  }
  return next;
}

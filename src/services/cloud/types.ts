import type { SalaryProfile, SalaryRecord, SalarySettings } from '../../types/salary';

export interface CloudUser {
  uid: string;
  email: string | null;
}

/** A deleted month, kept so the deletion reaches the other devices. */
export interface Tombstone {
  deleted: true;
  updatedAt: string;
}

export type RemoteEntry = SalaryRecord | Tombstone;

/** What lives under salary/{uid} in the database. Months are keyed by period ("2026-10"). */
export interface RemoteData {
  records?: Record<string, RemoteEntry>;
  settings?: { data: SalarySettings; updatedAt: string };
  profile?: { data: SalaryProfile; updatedAt: string };
}

/** Local bookkeeping needed to sync: deletions and when settings/profile last changed. */
export interface SyncMeta {
  tombstones: Record<string, string>;
  settingsAt?: string;
  profileAt?: string;
}

/** Path-keyed partial update, e.g. { "records/2026-10": {...}, "settings": {...} }. */
export type CloudUpdates = Record<string, unknown>;

export interface CloudBackend {
  onAuth(cb: (user: CloudUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  subscribe(uid: string, onData: (data: RemoteData) => void, onError: (e: unknown) => void): () => void;
  onConnection(cb: (online: boolean) => void): () => void;
  write(uid: string, updates: CloudUpdates): Promise<void>;
}

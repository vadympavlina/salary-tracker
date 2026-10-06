import { applyUpdates } from './merge';
import type { CloudBackend, CloudUser, RemoteData } from './types';

/**
 * In-memory stand-in for Firebase used by the e2e tests (enabled with
 * window.__SALARY_FAKE_CLOUD__). Users and data live in localStorage['fake_cloud'],
 * so a test can pre-fill "another device's" data and inspect what was uploaded.
 */
interface FakeState {
  users: Record<string, { password: string; uid: string }>;
  data: Record<string, RemoteData>;
  session: CloudUser | null;
}

const KEY = 'fake_cloud';
const read = (): FakeState => {
  try {
    return { users: {}, data: {}, session: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { users: {}, data: {}, session: null };
  }
};
const save = (s: FakeState) => localStorage.setItem(KEY, JSON.stringify(s));
const authListeners = new Set<(u: CloudUser | null) => void>();
const dataListeners = new Map<string, Set<(d: RemoteData) => void>>();
const emitData = (uid: string) => dataListeners.get(uid)?.forEach((cb) => cb(read().data[uid] ?? {}));

export const fakeBackend: CloudBackend = {
  onAuth(cb) {
    authListeners.add(cb);
    setTimeout(() => cb(read().session), 30);
    return () => authListeners.delete(cb);
  },
  async signIn(email, password) {
    const s = read();
    const u = s.users[email.trim().toLowerCase()];
    if (!u || u.password !== password) throw Object.assign(new Error('bad'), { code: 'auth/invalid-credential' });
    s.session = { uid: u.uid, email: email.trim().toLowerCase() };
    save(s);
    authListeners.forEach((cb) => cb(s.session));
  },
  async signOut() {
    const s = read();
    s.session = null;
    save(s);
    authListeners.forEach((cb) => cb(null));
  },
  async resetPassword() {},
  subscribe(uid, onData) {
    const set = dataListeners.get(uid) ?? new Set();
    set.add(onData);
    dataListeners.set(uid, set);
    setTimeout(() => onData(read().data[uid] ?? {}), 30);
    return () => set.delete(onData);
  },
  onConnection(cb) {
    setTimeout(() => cb(true), 10);
    return () => {};
  },
  async write(uid, updates) {
    const s = read();
    s.data[uid] = applyUpdates(s.data[uid] ?? {}, JSON.parse(JSON.stringify(updates)));
    save(s);
    setTimeout(() => emitData(uid), 10);
  },
};

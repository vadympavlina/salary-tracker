import { firebaseConfig, userPath } from './config';
import type { CloudBackend, CloudUser, RemoteData } from './types';

/**
 * Firebase (Auth + Realtime Database). The SDK is loaded lazily, after the app has
 * already rendered from the local copy, so it never slows down the first screen.
 */
const load = (() => {
  let p: Promise<{
    auth: import('firebase/auth').Auth;
    db: import('firebase/database').Database;
    A: typeof import('firebase/auth');
    D: typeof import('firebase/database');
  }> | null = null;
  return () =>
    (p ??= Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/database')]).then(([app, A, D]) => {
      const fb = app.initializeApp(firebaseConfig);
      return { auth: A.getAuth(fb), db: D.getDatabase(fb), A, D };
    }));
})();

/** Runs an async subscription and returns a synchronous unsubscribe. */
function lazySub(start: () => Promise<() => void>): () => void {
  let stop: (() => void) | null = null;
  let cancelled = false;
  start().then((s) => {
    if (cancelled) s();
    else stop = s;
  });
  return () => {
    cancelled = true;
    stop?.();
  };
}

export const firebaseBackend: CloudBackend = {
  onAuth(cb) {
    return lazySub(async () => {
      const { auth, A } = await load();
      return A.onAuthStateChanged(auth, (u) => cb(u ? ({ uid: u.uid, email: u.email } satisfies CloudUser) : null));
    });
  },
  async signIn(email, password) {
    const { auth, A } = await load();
    await A.signInWithEmailAndPassword(auth, email, password);
  },
  async signOut() {
    const { auth, A } = await load();
    await A.signOut(auth);
  },
  async resetPassword(email) {
    const { auth, A } = await load();
    auth.languageCode = 'uk';
    await A.sendPasswordResetEmail(auth, email);
  },
  subscribe(uid, onData, onError) {
    return lazySub(async () => {
      const { db, D } = await load();
      return D.onValue(D.ref(db, userPath(uid)), (snap) => onData((snap.val() ?? {}) as RemoteData), onError);
    });
  },
  onConnection(cb) {
    return lazySub(async () => {
      const { db, D } = await load();
      return D.onValue(D.ref(db, '.info/connected'), (snap) => cb(snap.val() === true));
    });
  },
  async write(uid, updates) {
    const { db, D } = await load();
    await D.update(D.ref(db, userPath(uid)), updates);
  },
};

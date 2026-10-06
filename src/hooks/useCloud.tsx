import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cloudBackend, type CloudUser } from '../services/cloud';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface CloudValue {
  backend: typeof cloudBackend;
  /** undefined = still checking; null = signed out. */
  user: CloudUser | null | undefined;
  /** The user chose to keep data on this device only (can sign in later in Settings). */
  localOnly: boolean;
  status: SyncStatus;
  setStatus: (s: SyncStatus) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  continueLocally: () => void;
  requestSignIn: () => void;
}

const MODE_KEY = 'salary_cloud_mode';
const USER_KEY = 'salary_cloud_user';

const readCachedUser = (): CloudUser | null | undefined => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CloudUser) : undefined;
  } catch {
    return undefined;
  }
};

/** Firebase error codes → short Ukrainian messages. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(code)) return 'Невірний email або пароль';
  if (code.includes('invalid-email')) return 'Перевір email — схоже, у ньому помилка';
  if (code.includes('too-many-requests')) return 'Забагато спроб. Спробуй трохи пізніше';
  if (code.includes('network-request-failed')) return 'Немає інтернету. Підключись і спробуй ще раз';
  if (code.includes('user-disabled')) return 'Цей акаунт вимкнено';
  return 'Не вдалося увійти. Спробуй ще раз';
}

const Ctx = createContext<CloudValue | null>(null);

export function CloudProvider({ children }: { children: ReactNode }) {
  // The last known user is cached so the app opens instantly (even offline) while Firebase loads.
  const [user, setUser] = useState<CloudUser | null | undefined>(readCachedUser);
  const [localOnly, setLocalOnly] = useState(() => {
    try {
      return localStorage.getItem(MODE_KEY) === 'local';
    } catch {
      return false;
    }
  });
  const [status, setStatus] = useState<SyncStatus>('idle');

  // Firebase is only loaded when the cloud is actually used (not in "без входу" mode).
  useEffect(() => {
    if (localOnly) return;
    return cloudBackend.onAuth((u) => {
      setUser(u);
      try {
        if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
        else localStorage.removeItem(USER_KEY);
      } catch {
        /* ignore */
      }
    });
  }, [localOnly]);

  const continueLocally = useCallback(() => {
    setLocalOnly(true);
    try {
      localStorage.setItem(MODE_KEY, 'local');
    } catch {
      /* ignore */
    }
  }, []);

  const requestSignIn = useCallback(() => {
    setLocalOnly(false);
    try {
      localStorage.removeItem(MODE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await cloudBackend.signIn(email.trim(), password);
      requestSignIn();
    },
    [requestSignIn],
  );

  const signOut = useCallback(async () => {
    await cloudBackend.signOut();
    setUser(null);
    setStatus('idle');
  }, []);

  const value = useMemo<CloudValue>(
    () => ({
      backend: cloudBackend,
      user,
      localOnly,
      status,
      setStatus,
      signIn,
      signOut,
      resetPassword: (email) => cloudBackend.resetPassword(email.trim()),
      continueLocally,
      requestSignIn,
    }),
    [user, localOnly, status, signIn, signOut, continueLocally, requestSignIn],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloud(): CloudValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCloud must be used inside CloudProvider');
  return ctx;
}

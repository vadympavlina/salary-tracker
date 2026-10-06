/**
 * Minimal async key-value contract. The app only talks to storage through this
 * interface, so localStorage can be swapped for Firebase / IndexedDB / an API
 * by providing another adapter — no UI or business code changes needed.
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export class LocalStorageAdapter implements StorageAdapter {
  private memory = new Map<string, string>();

  private get available(): boolean {
    try {
      const k = '__salary_probe__';
      window.localStorage.setItem(k, k);
      window.localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  private readonly useLocal = typeof window !== 'undefined' && this.available;

  async get<T>(key: string): Promise<T | null> {
    const raw = this.useLocal ? window.localStorage.getItem(key) : this.memory.get(key) ?? null;
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.useLocal) window.localStorage.setItem(key, raw);
    else this.memory.set(key, raw);
  }

  async remove(key: string): Promise<void> {
    if (this.useLocal) window.localStorage.removeItem(key);
    else this.memory.delete(key);
  }
}

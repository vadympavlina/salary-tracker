import { Component, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../../services/storage/salaryStorage';

interface State {
  error: Error | null;
}

/** Last-resort screen: never a blank page, and the user can always save their data. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  private downloadBackup = () => {
    const raw: Record<string, unknown> = {};
    for (const key of Object.values(STORAGE_KEYS)) {
      try {
        raw[key] = JSON.parse(localStorage.getItem(key) ?? 'null');
      } catch {
        raw[key] = localStorage.getItem(key);
      }
    }
    const records = raw[STORAGE_KEYS.records];
    const payload = { app: 'salary-tracker', exportedAt: new Date().toISOString(), records: Array.isArray(records) ? records : [], settings: raw[STORAGE_KEYS.settings], profile: raw[STORAGE_KEYS.profile] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="crash" role="alert">
        <h1>Щось пішло не так</h1>
        <p>Твої дані збережені на цьому пристрої. Спробуй перезавантажити сторінку — або спершу збережи резервну копію.</p>
        <div className="crash__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => location.reload()}>
            Перезавантажити
          </button>
          <button type="button" className="btn btn--secondary btn--lg" onClick={this.downloadBackup}>
            Завантажити резервну копію
          </button>
        </div>
      </main>
    );
  }
}

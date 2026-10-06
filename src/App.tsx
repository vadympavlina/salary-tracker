import { useEffect } from 'react';
import { matchPath, useRouter } from './router/router';
import { useSalary } from './hooks/useSalaryStore';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { CalculatePage } from './pages/CalculatePage';
import { ResultPage } from './pages/ResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { RecordPage } from './pages/RecordPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

const TITLES: Record<string, string> = {
  '/': 'Головна',
  '/calculate': 'Розрахунок',
  '/calculate/result': 'Результат',
  '/history': 'Історія',
  '/analytics': 'Аналітика',
  '/settings': 'Налаштування',
};

export function App() {
  const { path, query } = useRouter();
  const { ready } = useSalary();

  useEffect(() => {
    document.title = `${TITLES[path] ?? (path.startsWith('/history/') ? 'Деталі' : 'Зарплата')} · Зарплата`;
  }, [path]);

  if (!ready) return null;

  let page;
  let pushed = false;
  let recordId: Record<string, string> | null;
  if (path === '/') page = <HomePage />;
  else if (path === '/calculate') {
    page = <CalculatePage key={query.get('edit') ?? 'new'} />;
    pushed = query.has('edit');
  } else if (path === '/calculate/result') {
    page = <ResultPage />;
    pushed = true;
  } else if (path === '/history') page = <HistoryPage />;
  else if ((recordId = matchPath('/history/:id', path))) {
    page = <RecordPage id={recordId.id} />;
    pushed = true;
  } else if (path === '/analytics') page = <AnalyticsPage />;
  else if (path === '/settings') page = <SettingsPage />;
  else page = <NotFoundPage />;

  return (
    <AppLayout pageKey={path} hideTabBar={pushed}>
      {page}
    </AppLayout>
  );
}

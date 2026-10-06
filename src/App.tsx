import { useEffect } from 'react';
import { matchPath, useRouter } from './router/router';
import { useSalary } from './hooks/useSalaryStore';
import { useTheme } from './hooks/useTheme';
import { useCloud } from './hooks/useCloud';
import { LoginPage } from './pages/LoginPage';
import { useToast } from './components/ui/Toast';
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
  const { ready, settings } = useSalary();
  const cloud = useCloud();
  useTheme(settings.theme);
  const toast = useToast();

  useEffect(() => {
    const onUpdate = () =>
      toast('Доступна нова версія', { tone: 'info', duration: 15000, action: { label: 'Оновити', onClick: () => location.reload() } });
    window.addEventListener('app-updated', onUpdate);
    return () => window.removeEventListener('app-updated', onUpdate);
  }, [toast]);

  useEffect(() => {
    document.title = `${TITLES[path] ?? (path.startsWith('/history/') ? 'Деталі' : 'Зарплата')} · Зарплата`;
  }, [path]);

  if (!ready) return null;
  // Not signed in (and not using the app locally): sign-in screen. While Firebase is still
  // checking a never-signed-in device, show nothing for that split second.
  if (!cloud.localOnly && cloud.user === null) return <LoginPage />;
  if (!cloud.localOnly && cloud.user === undefined) return <div className="boot" aria-busy="true" />;

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

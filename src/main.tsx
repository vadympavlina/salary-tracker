import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import { App } from './App';
import { RouterProvider } from './router/router';
import { SalaryProvider } from './hooks/useSalaryStore';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { CloudProvider } from './hooks/useCloud';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider>
        <ToastProvider>
          <CloudProvider>
            <SalaryProvider>
              <App />
            </SalaryProvider>
          </CloudProvider>
        </ToastProvider>
      </RouterProvider>
    </ErrorBoundary>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((reg) => {
        // Home-screen apps are rarely reloaded: look for a new deploy whenever the app comes back.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(() => {
        /* offline support is optional */
      });
    // A new version took over (not the very first install) → let the app offer a reload.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) window.dispatchEvent(new Event('app-updated'));
    });
  });
}

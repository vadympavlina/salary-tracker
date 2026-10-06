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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <SalaryProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </SalaryProvider>
    </RouterProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {
      /* offline support is optional */
    });
  });
}

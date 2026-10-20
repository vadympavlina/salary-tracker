import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import { App } from './App';
import { RouterProvider } from './router/router';
import { registerServiceWorker } from './swUpdate';
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

// iOS Safari ignores user-scalable=no for pinch gestures; block them directly so the screen
// never zooms (owner's request). Scrolling and taps are unaffected.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);

registerServiceWorker();

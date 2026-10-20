import { APP_BASE } from './router/router';

/**
 * Service-worker lifecycle: a new deploy installs in the background and waits; the app shows
 * "Доступна нова версія" and switches only when the user taps "Оновити" (or on the next launch).
 * The running page therefore never loses the cached chunks of the version it started with.
 */
let registration: ServiceWorkerRegistration | undefined;
let reloadOnSwitch = false;

const announce = () => window.dispatchEvent(new Event('app-updated'));

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${APP_BASE}/sw.js`, { scope: `${APP_BASE}/` })
      .then((reg) => {
        registration = reg;
        // A version that finished installing earlier (e.g. while the app was in the background).
        if (reg.waiting && navigator.serviceWorker.controller) announce();
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => {
            // "installed" with an existing controller = an update, not the first install.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) announce();
          });
        });
        // Home-screen apps are rarely reloaded: look for a new deploy whenever the app comes back.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      })
      .catch(() => {
        /* offline support is optional */
      });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadOnSwitch) {
        reloadOnSwitch = false;
        window.location.reload();
      }
    });
  });
}

/** "Оновити": activate the waiting version, then reload once it controls the page. */
export function applyUpdate() {
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  reloadOnSwitch = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

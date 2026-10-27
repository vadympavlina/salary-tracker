import { APP_BASE } from './router/router';

/**
 * Service-worker lifecycle: a new deploy installs in the background and waits; the app shows
 * "Доступна нова версія" and switches only when the user taps "Оновити" (or on the next launch).
 * The running page therefore never loses the cached chunks of the version it started with.
 */
let registration: ServiceWorkerRegistration | undefined;
let reloadOnSwitch = false;

/** Build version of a worker (asked over a MessageChannel; '' if it doesn't answer). */
function versionOf(sw: ServiceWorker | null): Promise<string> {
  if (!sw) return Promise.resolve('');
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve(''), 3000);
    channel.port1.onmessage = (e) => {
      window.clearTimeout(timer);
      resolve(String(e.data ?? ''));
    };
    sw.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
  });
}

/**
 * Offers "Оновити" only for a real update: a waiting worker next to an active one, running a
 * different build. (Some engines report a first install or a re-registration as "installed".)
 */
async function announceIfNewer(reg: ServiceWorkerRegistration) {
  const waiting = reg.waiting;
  if (!waiting || !reg.active || !navigator.serviceWorker.controller) return;
  const [next, current] = await Promise.all([versionOf(waiting), versionOf(reg.active)]);
  if (next && next !== current) window.dispatchEvent(new Event('app-updated'));
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${APP_BASE}/sw.js`, { scope: `${APP_BASE}/` })
      .then((reg) => {
        registration = reg;
        // A version that finished installing earlier (e.g. while the app was in the background).
        announceIfNewer(reg);
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed') announceIfNewer(reg);
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

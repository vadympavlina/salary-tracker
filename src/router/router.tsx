import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

/**
 * Tiny hash router (~1 KB): every screen lives under the same real file
 * (/salary-tracker/#/history …), so GitHub Pages always answers 200 OK.
 * That matters on iPhone: "Add to Home Screen" re-loads the current URL to find
 * the icon, and a path URL answered by 404.html made iOS drop the icon.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

// Old path-style links (/salary-tracker/settings) still work: turn them into #/settings.
if (typeof window !== 'undefined') {
  const rest = window.location.pathname.startsWith(BASE) ? window.location.pathname.slice(BASE.length) : '';
  const legacy = rest.replace(/\/+$/, '').replace(/^\/index\.html$/, '');
  if (legacy && legacy !== '/' && !window.location.hash) {
    window.history.replaceState(window.history.state, '', `${BASE}/#${legacy}${window.location.search}`);
  }
}

interface Location {
  path: string;
  query: URLSearchParams;
  state: unknown;
}

interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

interface RouterValue extends Location {
  navigate: (to: string, opts?: NavigateOptions) => void;
  /** Goes back in history when it belongs to the app, otherwise to `fallback`. */
  back: (fallback: string) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

function readLocation(): Location {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [rawPath, search = ''] = hash.split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const hs = window.history.state as { usr?: unknown } | null;
  return { path, query: new URLSearchParams(search), state: hs?.usr };
}

/** In-app URL: home is the plain app URL, every other screen is #/path. */
export const href = (to: string) => (to === '/' ? `${BASE}/` : `${BASE}/#${to}`);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState<Location>(readLocation);

  useEffect(() => {
    const onPop = () => setLoc(readLocation());
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop); // typed / pasted #/… URLs
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const navigate = useCallback((to: string, opts: NavigateOptions = {}) => {
    const prev = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    const st = { usr: opts.state, idx: opts.replace ? prev : prev + 1 };
    if (opts.replace) window.history.replaceState(st, '', href(to));
    else window.history.pushState(st, '', href(to));
    setLoc(readLocation());
    window.scrollTo({ top: 0 });
  }, []);

  const back = useCallback(
    (fallback: string) => {
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (idx > 0) window.history.back();
      else navigate(fallback, { replace: true });
    },
    [navigate],
  );

  const value = useMemo(() => ({ ...loc, navigate, back }), [loc, navigate, back]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}

/** Matches "/history/:id" against a path, returning params or null. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; replace?: boolean; state?: unknown };

export function Link({ to, replace, state, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to, { replace, state });
  };
  return <a href={href(to)} onClick={handle} {...rest} />;
}

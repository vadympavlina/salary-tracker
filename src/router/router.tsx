import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

/**
 * Tiny History-API router (~1 KB) — enough for this app and much lighter than a
 * routing library. Works under the GitHub Pages sub-path via Vite's BASE_URL;
 * deep links are served by 404.html (a copy of index.html, see vite.config.ts).
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

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
  let path = window.location.pathname;
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
  path = path.replace(/\/+$/, '') || '/';
  const hs = window.history.state as { usr?: unknown } | null;
  return { path, query: new URLSearchParams(window.location.search), state: hs?.usr };
}

export const href = (to: string) => `${BASE}${to === '/' ? '/' : to}`;

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState<Location>(readLocation);

  useEffect(() => {
    const onPop = () => setLoc(readLocation());
    window.addEventListener('popstate', onPop);
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    return () => window.removeEventListener('popstate', onPop);
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

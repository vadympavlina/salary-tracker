import { useEffect } from 'react';
import type { ThemePreference } from '../types/salary';

const META_COLORS = { light: '#F5F5FA', dark: '#0C0C13' } as const;

/** Applies the theme to <html data-theme> and the browser/status-bar color. */
export function applyTheme(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const mode = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[mode]);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', mode);
}

/** Keeps the page in sync with the setting, and with the OS when set to "system". */
export function useTheme(pref: ThemePreference) {
  useEffect(() => {
    applyTheme(pref);
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);
}

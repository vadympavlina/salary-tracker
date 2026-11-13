import { useEffect, useRef, type ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { Sidebar } from './Sidebar';

interface Props {
  children: ReactNode;
  /** Pushed screens (result, details) hide the tab bar on phones, like iOS. */
  hideTabBar?: boolean;
  pageKey: string;
}

export function AppLayout({ children, hideTabBar, pageKey }: Props) {
  // After a navigation the clicked link is gone (or stays focused on the old screen): move focus
  // to the new screen so keyboard and screen-reader users start from its top. Not on first load.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pageKey]);
  return (
    <div className={`app${hideTabBar ? ' app--pushed' : ''}`}>
      {/* Not a "#main" link: with hash routing that would navigate to a "main" route. */}
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Перейти до вмісту
      </a>
      <Sidebar />
      <main id="main" className="main" tabIndex={-1}>
        <div key={pageKey} className="page">
          {children}
        </div>
      </main>
      {!hideTabBar && <BottomNavigation />}
    </div>
  );
}

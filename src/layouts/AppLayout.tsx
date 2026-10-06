import type { ReactNode } from 'react';
import { BottomNavigation } from './BottomNavigation';
import { Sidebar } from './Sidebar';

interface Props {
  children: ReactNode;
  /** Pushed screens (result, details) hide the tab bar on phones, like iOS. */
  hideTabBar?: boolean;
  pageKey: string;
}

export function AppLayout({ children, hideTabBar, pageKey }: Props) {
  return (
    <div className={`app${hideTabBar ? ' app--pushed' : ''}`}>
      <a href="#main" className="skip-link">
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

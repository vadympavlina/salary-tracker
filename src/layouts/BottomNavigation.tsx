import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useRouter } from '../router/router';
import { NAV_ITEMS } from './navItems';

/**
 * Floating glass tab bar. The selected tab sits under a glass "lens" that flows to the next
 * tab: it slides with a spring and stretches like a drop while moving (iOS 26 style).
 */
export function BottomNavigation() {
  const { path } = useRouter();
  const index = NAV_ITEMS.findIndex((item) => item.match(path));
  const [moving, setMoving] = useState(false);
  const prev = useRef(index);

  useEffect(() => {
    if (prev.current === index) return;
    const jumped = prev.current >= 0 && index >= 0;
    prev.current = index;
    if (!jumped) return;
    setMoving(true);
    const t = window.setTimeout(() => setMoving(false), 260);
    return () => window.clearTimeout(t);
  }, [index]);

  return (
    <nav className="tabbar" aria-label="Основна навігація">
      <ul className="tabbar__list" style={{ '--tabs': NAV_ITEMS.length, '--i': Math.max(index, 0) } as CSSProperties}>
        <li className={`tabbar__lens${moving ? ' is-moving' : ''}${index < 0 ? ' is-hidden' : ''}`} aria-hidden="true" />
        {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={to}>
              <Link to={to} className={`tabbar__item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                <Icon size={23} strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

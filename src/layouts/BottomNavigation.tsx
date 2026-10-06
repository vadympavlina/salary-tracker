import { Link, useRouter } from '../router/router';
import { NAV_ITEMS } from './navItems';

export function BottomNavigation() {
  const { path } = useRouter();
  return (
    <nav className="tabbar" aria-label="Основна навігація">
      <ul className="tabbar__list">
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

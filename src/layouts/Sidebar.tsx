import { Plus } from 'lucide-react';
import { Link, useRouter } from '../router/router';
import { NAV_ITEMS } from './navItems';
import { useSalary } from '../hooks/useSalaryStore';

export function Sidebar() {
  const { path } = useRouter();
  const { profile } = useSalary();
  const initials = profile.fullName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar__brand">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={36} height={36} />
        <span>Зарплата</span>
      </Link>
      <Link to="/calculate?new=1" className="btn btn--primary btn--md btn--block sidebar__cta">
        <Plus size={18} aria-hidden="true" />
        <span>Новий розрахунок</span>
      </Link>
      <nav aria-label="Основна навігація">
        <ul className="sidebar__list">
          {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
            const active = match(path);
            return (
              <li key={to}>
                <Link to={to} className={`sidebar__item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                  <Icon size={20} strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Link to="/settings" className="sidebar__profile">
        <span className="avatar avatar--sm">{initials}</span>
        <span>
          <b>{profile.fullName}</b>
          <small>Особистий профіль</small>
        </span>
      </Link>
    </aside>
  );
}

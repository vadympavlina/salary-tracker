import { useRouter } from '../router/router';
import { GlassTabs } from '../components/ui/GlassTabs';
import { NAV_ITEMS } from './navItems';

/**
 * Floating Liquid Glass tab bar (Glisse): the selected tab sits under a glass lens that can be
 * dragged along the bar and springs onto the tab where it is released.
 */
export function BottomNavigation() {
  const { path } = useRouter();
  const active = NAV_ITEMS.find((item) => item.match(path))?.to ?? null;
  return (
    <div className="tabbar">
      <GlassTabs
        className="tabbar__glass"
        label="Основна навігація"
        value={active}
        height={54}
        items={NAV_ITEMS.map(({ to, label, icon: Icon }) => ({
          value: to,
          to,
          label: (
            <span className="tabbar__item">
              <Icon size={23} strokeWidth={to === active ? 2.3 : 1.9} aria-hidden="true" />
              <span className="tabbar__label">{label}</span>
            </span>
          ),
        }))}
      />
    </div>
  );
}

import type { CSSProperties, ReactNode } from 'react';
import { TabBar } from 'glisse';
import { Link } from '../../router/router';

export interface GlassTab {
  value: string;
  label: ReactNode;
  /** In-app route: the tab is a real link (navigation bar). */
  to?: string;
}

interface Props {
  items: GlassTab[];
  value: string | null;
  onChange?: (value: string) => void;
  label: string;
  /** Tab height in px; without it the height comes from CSS (--lg-tab-height). */
  height?: number;
  className?: string;
}

/** Glisse links get `href`; ours route through the hash router. */
function RouteLink({ href, ...rest }: { href: string; [key: string]: unknown }) {
  return <Link to={href} {...rest} />;
}

/**
 * Glisse Liquid Glass tab bar (draggable lens with spring, refraction) stretched to the
 * container's width. Glisse sizes tabs with a fixed --lg-tab-width, so the wrapper is a size
 * container and each tab is an equal share of it (100cqw) — pure CSS, correct on the very first
 * paint, also inside a <dialog> that is still closed.
 */
export function GlassTabs({ items, value, onChange, label, height, className = '' }: Props) {
  const wrapper = { '--tabs': items.length } as CSSProperties;
  // Glisse declares --lg-tab-height on the bar itself, so an override has to be set on the bar too.
  const bar = (height ? { '--lg-tab-height': `${height}px` } : undefined) as CSSProperties | undefined;
  return (
    <div className={`glass-tabs ${className}`.trim()} style={wrapper}>
      <TabBar
        aria-label={label}
        items={items.map((it) => ({ value: it.value, label: it.label, href: it.to }))}
        value={value}
        onValueChange={onChange}
        link={RouteLink}
        style={bar}
      />
    </div>
  );
}

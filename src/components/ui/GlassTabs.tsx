import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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

const PAD = 4; // .lg-tab-bar padding

/**
 * Glisse Liquid Glass tab bar (draggable lens with spring, refraction) stretched to the
 * container's width: Glisse sizes tabs with a fixed --lg-tab-width, so we measure and set it.
 */
export function GlassTabs({ items, value, onChange, label, height, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tab = width ? Math.floor(((width - PAD * 2) / items.length) * 100) / 100 : 84;
  const style = { '--lg-tab-width': `${tab}px`, ...(height ? { '--lg-tab-height': `${height}px` } : {}) } as CSSProperties;

  return (
    <div ref={ref} className={`glass-tabs ${className}`.trim()}>
      <TabBar
        aria-label={label}
        items={items.map((it) => ({ value: it.value, label: it.label, href: it.to }))}
        value={value}
        onValueChange={onChange}
        link={RouteLink}
        style={style}
      />
    </div>
  );
}

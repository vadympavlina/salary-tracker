import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useRouter } from '../router/router';
import { NAV_ITEMS } from './navItems';

const PAD = 5; // .tabbar__list padding
const DRAG_START = 6; // px of horizontal travel before a press becomes a drag

interface Drag {
  pointer: number;
  startX: number;
  left: number;
  cell: number;
  active: boolean;
  over: number;
}

/**
 * Floating glass tab bar. The selected tab sits under a glass "lens" that flows to the next
 * tab: it slides with a spring and stretches like a drop while moving (iOS 26 style).
 * The lens can also be dragged: slide a finger along the bar and it follows, then snaps to the
 * nearest tab and opens it on release. A plain tap still works like a normal link.
 */
export function BottomNavigation() {
  const { path, navigate } = useRouter();
  const index = NAV_ITEMS.findIndex((item) => item.match(path));
  const [moving, setMoving] = useState(false);
  const [drag, setDrag] = useState<{ x: number; over: number } | null>(null);
  const prev = useRef(index);
  const listRef = useRef<HTMLUListElement>(null);
  const d = useRef<Drag | null>(null);
  const swallowClick = useRef(false);

  useEffect(() => {
    if (prev.current === index) return;
    const jumped = prev.current >= 0 && index >= 0;
    prev.current = index;
    if (!jumped) return;
    setMoving(true);
    const t = window.setTimeout(() => setMoving(false), 260);
    return () => window.clearTimeout(t);
  }, [index]);

  const lensX = (clientX: number, s: Drag) => Math.min(Math.max(clientX - s.left - PAD - s.cell / 2, 0), s.cell * (NAV_ITEMS.length - 1));

  const onPointerDown = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (e.button !== 0) return;
    const r = listRef.current!.getBoundingClientRect();
    const cell = (r.width - PAD * 2) / NAV_ITEMS.length;
    d.current = { pointer: e.pointerId, startX: e.clientX, left: r.left, cell, active: false, over: index };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLUListElement>) => {
    const s = d.current;
    if (!s || e.pointerId !== s.pointer) return;
    if (!s.active) {
      if (Math.abs(e.clientX - s.startX) < DRAG_START) return;
      s.active = true;
      listRef.current?.setPointerCapture(e.pointerId);
    }
    const x = lensX(e.clientX, s);
    const over = Math.round(x / s.cell);
    if (over !== s.over && 'vibrate' in navigator) navigator.vibrate?.(4);
    s.over = over;
    setDrag({ x, over });
  };

  const end = (e: ReactPointerEvent<HTMLUListElement>, cancelled = false) => {
    const s = d.current;
    d.current = null;
    if (!s || e.pointerId !== s.pointer || !s.active) return;
    swallowClick.current = true; // the click that follows a drag must not open the tab under the finger
    window.setTimeout(() => (swallowClick.current = false), 60);
    setDrag(null);
    const target = NAV_ITEMS[s.over];
    if (!cancelled && target && s.over !== index) navigate(target.to);
  };

  const shown = drag ? drag.over : index;
  const style = { '--tabs': NAV_ITEMS.length, '--i': Math.max(index, 0), ...(drag ? { '--drag-x': `${drag.x}px` } : {}) } as CSSProperties;

  return (
    <nav className="tabbar" aria-label="Основна навігація">
      <ul
        ref={listRef}
        className={`tabbar__list${drag ? ' is-dragging' : ''}`}
        style={style}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => end(e)}
        onPointerCancel={(e) => end(e, true)}
        onClickCapture={(e) => {
          if (swallowClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <li className={`tabbar__lens${moving ? ' is-moving' : ''}${index < 0 && !drag ? ' is-hidden' : ''}`} aria-hidden="true" />
        {NAV_ITEMS.map(({ to, label, icon: Icon, match }, i) => {
          const active = match(path);
          return (
            <li key={to}>
              <Link
                to={to}
                className={`tabbar__item${i === shown ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                draggable={false}
              >
                <Icon size={23} strokeWidth={i === shown ? 2.3 : 1.9} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

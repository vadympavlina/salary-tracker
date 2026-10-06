import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface SwipeAction {
  label: string;
  icon: ReactNode;
  tone: 'grey' | 'red';
  onClick: () => void;
}

interface Props {
  actions: SwipeAction[];
  /** A long swipe across most of the row runs the last action (iOS "full swipe"). */
  fullSwipe?: boolean;
  children: ReactNode;
}

const ACTION_W = 78;
const OPEN_EVENT = 'swipe-row-open';
const FULL_SWIPE = 0.62;

/**
 * iOS-style row: drag left to reveal actions; tap anywhere else (or drag back) to close.
 * Vertical scrolling stays native (touch-action: pan-y); the drag only starts once the
 * gesture is clearly horizontal. Mouse users get the same actions on the record screen.
 */
export function SwipeRow({ actions, fullSwipe = true, children }: Props) {
  const id = useId();
  const width = ACTION_W * actions.length;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const g = useRef<{
    x: number;
    y: number;
    base: number;
    dir: 'h' | 'v' | null;
    moved: boolean;
  } | null>(null);
  const open = offset < 0;
  // Swallows the click that the browser fires at the end of a drag.
  const suppressClick = useRef(false);

  // Only one open row at a time; any tap outside closes it.
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) setOffset(0);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [id]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rowRef.current?.contains(e.target as Node)) setOffset(0);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    g.current = {
      x: e.clientX,
      y: e.clientY,
      base: offset,
      dir: null,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.dir) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (s.dir === 'h') {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
        window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
      }
    }
    if (s.dir !== 'h') return;
    s.moved = true;
    const rowW = rowRef.current?.offsetWidth ?? 360;
    let next = Math.min(0, s.base + dx);
    // Rubber band past the action buttons (unless a full swipe is allowed).
    if (next < -width && !fullSwipe) next = -width - (-next - width) * 0.25;
    setOffset(Math.max(next, -rowW));
  };
  const onPointerUp = () => {
    const s = g.current;
    g.current = null;
    if (!s || s.dir !== 'h') return;
    setDragging(false);
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 50);
    const rowW = rowRef.current?.offsetWidth ?? 360;
    if (fullSwipe && -offset > rowW * FULL_SWIPE) {
      setOffset(0);
      actions[actions.length - 1].onClick();
      return;
    }
    const shouldOpen = s.base < 0 ? -offset > width * 0.7 : -offset > 44;
    setOffset(shouldOpen ? -width : 0);
  };

  const pastFull = fullSwipe && -offset > (rowRef.current?.offsetWidth ?? 360) * FULL_SWIPE;

  return (
    <div ref={rowRef} className={`swipe${dragging ? ' swipe--dragging' : ''}${open ? ' swipe--open' : ''}`}>
      <div className={`swipe__actions${pastFull ? ' swipe__actions--full' : ''}`} style={{ width: Math.max(width, -offset) }} aria-hidden={!open}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`swipe__btn swipe__btn--${a.tone}`}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setOffset(0);
              a.onClick();
            }}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      <div
        className="swipe__content"
        style={{
          transform: offset ? `translate3d(${offset}px, 0, 0)` : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // A tap on an open row (or the click that ends a drag) closes it instead of navigating.
          if (open || suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
            setOffset(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

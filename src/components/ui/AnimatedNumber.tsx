import { useEffect, useRef, useState } from 'react';
import { formatUAH } from '../../utils/format';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Props {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

/** Counts from the previous value to the new one (ease-out). Screen readers get the final value only. */
export function AnimatedNumber({ value, format = formatUAH, duration = 650, className }: Props) {
  const initial = reduced() ? value : Math.round(value * 0.82);
  const [shown, setShown] = useState(initial);
  // Last painted value — new animations continue from wherever the previous one stopped.
  const from = useRef(initial);

  useEffect(() => {
    if (reduced()) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = t < 1 ? Math.round(a + (value - a) * eased) : value;
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={`num ${className ?? ''}`} data-value={format(value)}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

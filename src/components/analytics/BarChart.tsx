import { useMemo, useState, type CSSProperties } from 'react';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Full label for the tooltip, e.g. "Жовтень 2026". */
  title: string;
}

interface Props {
  data: BarDatum[];
  format: (n: number) => string;
  axisFormat: (n: number) => string;
  ariaLabel: string;
  height?: number;
}

const TICKS = 4;

/** Rounds the axis maximum so every one of the 4 gridlines lands on a clean number. */
function niceMax(v: number): number {
  if (v <= 0) return TICKS;
  const raw = v / TICKS;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / exp;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * exp;
  return Math.max(step * TICKS, TICKS);
}

/**
 * Single-series column chart in plain SVG (no chart library).
 * Hover / focus / tap a column for its exact value; the latest month is highlighted.
 */
export function BarChart({ data, format, axisFormat, ariaLabel, height = 200 }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const max = useMemo(() => niceMax(Math.max(...data.map((d) => d.value), 0)), [data]);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  const W = 100; // percentage-based x for responsiveness
  const band = W / Math.max(data.length, 1);
  const shown = active ?? data.length - 1;
  const focus = data[shown];

  return (
    <div className="bar-chart" style={{ '--h': `${height}px` } as CSSProperties}>
      <div className="bar-chart__readout" aria-live="polite">
        {focus && (
          <>
            <span className="bar-chart__readout-label">{focus.title}</span>
            <span className="bar-chart__readout-value num">{format(focus.value)}</span>
          </>
        )}
      </div>
      <div className="bar-chart__plot">
        <div className="bar-chart__axis" aria-hidden="true">
          {[...ticks].reverse().map((t) => (
            <span key={t}>{axisFormat(t)}</span>
          ))}
        </div>
        <div className="bar-chart__area">
          <div className="bar-chart__grid" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} />
            ))}
          </div>
          <ul className="bar-chart__bars" role="list" aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
            {data.map((d, i) => (
              <li key={d.key} style={{ width: `${band}%` }}>
                <button
                  type="button"
                  className={`bar${i === shown ? ' bar--active' : ''}`}
                  aria-label={`${d.title}: ${format(d.value)}`}
                  aria-pressed={i === shown}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  <span
                    className="bar__fill"
                    style={{ '--v': d.value / max, '--delay': `${i * 40}ms` } as CSSProperties}
                  />
                </button>
                <span className="bar__label" aria-hidden="true">
                  {d.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { StructureSlice } from '../../services/calculations/analytics';
import { formatUAH } from '../../utils/format';

const COLORS: Record<StructureSlice['key'], string> = {
  videos: 'var(--chart-1)',
  pairs: 'var(--chart-2)',
  extra: 'var(--chart-3)',
};

/** Donut + legend (identity never relies on color alone: legend has labels and values). */
export function DonutChart({ slices }: { slices: StructureSlice[] }) {
  const [active, setActive] = useState<string | null>(null);
  const R = 52;
  const C = 2 * Math.PI * R;
  const GAP = slices.length > 1 ? 2.2 : 0; // surface gap between segments (in px of stroke length)
  let offset = 0;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const current = slices.find((s) => s.key === active);

  return (
    <div className="donut">
      <div className="donut__chart">
        <svg viewBox="0 0 140 140" role="img" aria-label={slices.map((s) => `${s.label} ${Math.round(s.percent)}%`).join(', ')}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--chart-grid)" strokeWidth="18" />
          {slices.map((s, i) => {
            const len = (s.percent / 100) * C;
            const dash = Math.max(len - GAP, 0.01);
            const el = (
              <circle
                key={s.key}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={COLORS[s.key]}
                strokeWidth={active === s.key ? 21 : 18}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
                className="donut__seg"
                style={{ animationDelay: `${i * 80}ms` }}
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="donut__center" aria-hidden="true">
          <span>{current ? current.label : 'Усього'}</span>
          <b className="num">{formatUAH(current ? current.value : total)}</b>
        </div>
      </div>
      <ul className="legend">
        {slices.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              className={`legend__item${active === s.key ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.key)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === s.key ? null : s.key)}
            >
              <span className="legend__dot" style={{ background: COLORS[s.key] }} aria-hidden="true" />
              <span className="legend__label">{s.label}</span>
              <span className="legend__value num">{formatUAH(s.value)}</span>
              <span className="legend__pct num">{Math.round(s.percent)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

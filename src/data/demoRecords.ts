import type { SalaryInput } from '../types/salary';

type DemoRow = Omit<SalaryInput, 'advanceMode' | 'taxRate'>;

/** Demo months shown on first launch. Earned: 18 420 … 28 450 ₴. */
const rows: DemoRow[] = [
  { period: '2026-05', pairs: 8, pairRate: 350, videos: 336, videoRate: 45, advance: 4000, additional: 500, received: 10000, cashReceived: 4420 },
  { period: '2026-06', pairs: 9, pairRate: 350, videos: 380, videoRate: 45, advance: 4000, additional: 600, received: 12000, cashReceived: 4850 },
  { period: '2026-07', pairs: 10, pairRate: 350, videos: 398, videoRate: 45, advance: 4000, additional: 700, received: 12000, cashReceived: 6110 },
  { period: '2026-08', pairs: 10, pairRate: 350, videos: 441, videoRate: 45, advance: 0, additional: 975, received: 0, cashReceived: 0 },
  { period: '2026-09', pairs: 11, pairRate: 350, videos: 484, videoRate: 45, advance: 5000, additional: 1150, received: 15000, cashReceived: 6780 },
  { period: '2026-10', pairs: 12, pairRate: 350, videos: 510, videoRate: 45, advance: 5000, additional: 1300, received: 15000, cashReceived: 8450 },
];

export const DEMO_INPUTS: SalaryInput[] = rows.map((r) => ({ ...r, advanceMode: 'part', taxRate: 9 }));

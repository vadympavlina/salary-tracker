import type { SalaryInput } from '../types/salary';

type DemoRow = Omit<SalaryInput, 'advanceMode'>;

/** Demo months shown on first launch. Earned: 18 420 … 28 450 ₴. */
const rows: DemoRow[] = [
  { period: '2026-05', pairItems: [{ count: 8, rate: 350 }], videoItems: [{ count: 336, rate: 45 }], advance: 4000, additional: 500, received: 10000, cashReceived: 4420 },
  { period: '2026-06', pairItems: [{ count: 9, rate: 350 }], videoItems: [{ count: 380, rate: 45 }], advance: 4000, additional: 600, received: 12000, cashReceived: 4850 },
  { period: '2026-07', pairItems: [{ count: 10, rate: 350 }], videoItems: [{ count: 398, rate: 45 }], advance: 4000, additional: 700, received: 12000, cashReceived: 6110 },
  { period: '2026-08', pairItems: [{ count: 10, rate: 350 }], videoItems: [{ count: 441, rate: 45 }], advance: 0, additional: 975, received: 0, cashReceived: 0 },
  { period: '2026-09', pairItems: [{ count: 11, rate: 350 }], videoItems: [{ count: 484, rate: 45 }], advance: 5000, additional: 1150, received: 15000, cashReceived: 6780 },
  { period: '2026-10', pairItems: [{ count: 12, rate: 350 }], videoItems: [{ count: 510, rate: 45 }], advance: 5000, additional: 1300, received: 15000, cashReceived: 8450 },
];

export const DEMO_INPUTS: SalaryInput[] = rows.map((r) => ({ ...r, advanceMode: 'part' }));

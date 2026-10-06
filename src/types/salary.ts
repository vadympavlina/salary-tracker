/** "YYYY-MM" — the month a salary record belongs to. */
export type Period = string;

/**
 * How the advance is treated:
 * - `part`  — advance is an early part of the salary (already received, reduces what's left to pay);
 * - `extra` — advance is an additional payment on top of the earned salary (also counted as received).
 */
export type AdvanceMode = 'part' | 'extra';

export type PaymentStatus = 'paid' | 'partial' | 'pending';

export type ThemePreference = 'light' | 'dark' | 'system';

/** One "count × rate" line. A month can have several when the rate changed mid-month. */
export interface RateLine {
  count: number;
  rate: number;
}

/** Raw inputs the user enters for a month. Everything else is derived by `calculateSalary`. */
export interface SalaryInput {
  period: Period;
  /** Pairs taught, one line per rate (usually just one). */
  pairItems: RateLine[];
  /** Checked videos, one line per rate (usually just one). */
  videoItems: RateLine[];
  advance: number;
  additional: number;
  /** Amount that actually arrived on the bank card (excluding the advance). */
  received: number;
  /** Cash already received "на руки" (the part that doesn't come to the card). */
  cashReceived: number;
  /** Snapshot of the setting at the time of saving, so history never changes retroactively. */
  advanceMode: AdvanceMode;
  /** Free-form comment for the month. */
  note?: string;
}

export interface SalaryRecord extends SalaryInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: PaymentStatus;
}

export interface SalaryCalculation {
  /** Total pairs across all rate lines. */
  pairs: number;
  /** Total videos across all rate lines. */
  videos: number;
  pairIncome: number;
  videoIncome: number;
  /** Additional payments counted as income (additional, plus advance in `extra` mode). */
  extraIncome: number;
  /** Total earned for the month ("Всього нараховано"). Taxes are already withheld. */
  grossIncome: number;
  advance: number;
  additional: number;
  /** Arrived on card. */
  received: number;
  /** "Сума на руки": what is paid in hand after the advance and the card — earned − advance − card. */
  netIncome: number;
  /** Cash already received in hand. */
  cashReceived: number;
  /** Advance + card + cash. */
  totalReceived: number;
  /** What is still owed (never negative) = на руки − отримано на руки. */
  remaining: number;
  status: PaymentStatus;
}

export interface SalarySettings {
  pairRate: number;
  videoRate: number;
  advanceMode: AdvanceMode;
  /** Default advance pre-filled into a new calculation (0 = empty). */
  defaultAdvance: number;
  /** Fixed amount that comes to the card every month; pre-filled into a new month. */
  defaultCard: number;
  /** Light by default; dark or follow the OS on request. */
  theme: ThemePreference;
}

export interface SalaryProfile {
  firstName: string;
  fullName: string;
}

export interface ExportPayload {
  app: 'salary-tracker';
  schemaVersion: number;
  exportedAt: string;
  records: SalaryRecord[];
  settings: SalarySettings;
  profile: SalaryProfile;
}

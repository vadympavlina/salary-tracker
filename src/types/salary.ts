/** "YYYY-MM" — the month a salary record belongs to. */
export type Period = string;

/**
 * How the advance is treated:
 * - `part`  — advance is an early part of the salary (already received, reduces what's left to pay);
 * - `extra` — advance is an additional payment on top of the earned salary (also counted as received).
 */
export type AdvanceMode = 'part' | 'extra';

export type PaymentStatus = 'paid' | 'partial' | 'pending';

/** Raw inputs the user enters for a month. Everything else is derived by `calculateSalary`. */
export interface SalaryInput {
  period: Period;
  pairs: number;
  pairRate: number;
  videos: number;
  videoRate: number;
  advance: number;
  additional: number;
  /** Amount that actually arrived on the bank card (excluding the advance). */
  received: number;
  /** Snapshot of the setting at the time of saving, so history never changes retroactively. */
  advanceMode: AdvanceMode;
  /** Informational tax rate (%), rates are entered net of tax. */
  taxRate: number;
  note?: string;
}

export interface SalaryRecord extends SalaryInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: PaymentStatus;
  /** Marks seeded demo rows so they can be cleared in one tap. */
  isDemo?: boolean;
}

export interface SalaryCalculation {
  pairIncome: number;
  videoIncome: number;
  /** Additional payments counted as income (additional, plus advance in `extra` mode). */
  extraIncome: number;
  /** Total earned for the month ("Всього нараховано"). Taxes are already withheld. */
  grossIncome: number;
  advance: number;
  additional: number;
  /** What the user gets in hand for the month ("Сума на руки"). */
  netIncome: number;
  /** What should arrive on the card after the advance. */
  expectedOnCard: number;
  /** Arrived on card. */
  received: number;
  /** Advance + card. */
  totalReceived: number;
  /** What is still owed (never negative). */
  remaining: number;
  /** Card amount minus expected on card: >0 overpaid, <0 underpaid. */
  cardDifference: number;
  /** Informational: tax withheld on top of netIncome at `taxRate`. */
  taxEstimate: number;
  status: PaymentStatus;
}

export interface SalarySettings {
  pairRate: number;
  videoRate: number;
  taxRate: number;
  advanceMode: AdvanceMode;
  /** Default advance pre-filled into a new calculation (0 = empty). */
  defaultAdvance: number;
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

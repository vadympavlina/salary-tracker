import type { PaymentStatus, SalaryCalculation, SalaryInput } from '../../types/salary';

const round2 = (n: number) => Math.round(n * 100) / 100;
const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Payment status from what should be received vs. what actually was. */
export function getPaymentStatus(netIncome: number, totalReceived: number): PaymentStatus {
  if (totalReceived <= 0) return netIncome <= 0 ? 'paid' : 'pending';
  return totalReceived >= netIncome ? 'paid' : 'partial';
}

/**
 * Pure salary calculation. No UI, no storage — safe to reuse anywhere (and on a server later).
 *
 * part  mode: earned = pairs + videos + additional;            received = advance + card
 * extra mode: earned = pairs + videos + additional + advance;  received = advance + card
 * remaining = earned − received
 */
export function calculateSalary(input: SalaryInput): SalaryCalculation {
  const pairIncome = round2(safe(input.pairs) * safe(input.pairRate));
  const videoIncome = round2(safe(input.videos) * safe(input.videoRate));
  const advance = safe(input.advance);
  const additional = safe(input.additional);
  const received = safe(input.received);

  const extraIncome = round2(additional + (input.advanceMode === 'extra' ? advance : 0));
  const grossIncome = round2(pairIncome + videoIncome + extraIncome);
  const netIncome = grossIncome;
  const expectedOnCard = round2(Math.max(0, netIncome - advance));
  const totalReceived = round2(advance + received);
  const remaining = round2(Math.max(0, netIncome - totalReceived));
  const cardDifference = round2(received - expectedOnCard);

  const taxRate = Math.min(Math.max(safe(input.taxRate), 0), 99);
  const taxEstimate = round2((netIncome * taxRate) / (100 - taxRate));

  return {
    pairIncome,
    videoIncome,
    extraIncome,
    grossIncome,
    advance,
    additional,
    netIncome,
    expectedOnCard,
    received,
    totalReceived,
    remaining,
    cardDifference,
    taxEstimate,
    status: getPaymentStatus(netIncome, totalReceived),
  };
}

/** Relative change in percent (rounded), or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

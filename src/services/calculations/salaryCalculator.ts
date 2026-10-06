import type { PaymentStatus, SalaryCalculation, SalaryInput } from '../../types/salary';

const round2 = (n: number) => Math.round(n * 100) / 100;
const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Payment status: everything earned received → paid; something received → partial; nothing → pending. */
export function getPaymentStatus(grossIncome: number, totalReceived: number): PaymentStatus {
  if (totalReceived <= 0) return grossIncome <= 0 ? 'paid' : 'pending';
  return totalReceived >= grossIncome ? 'paid' : 'partial';
}

/**
 * Pure salary calculation. No UI, no storage — safe to reuse anywhere (and on a server later).
 *
 * earned    = pairs + videos + additional (+ advance in `extra` mode)
 * на руки   = earned − advance − card
 * received  = advance + card + cash in hand
 * remaining = на руки − cash in hand
 */
export function calculateSalary(input: SalaryInput): SalaryCalculation {
  const pairIncome = round2(safe(input.pairs) * safe(input.pairRate));
  const videoIncome = round2(safe(input.videos) * safe(input.videoRate));
  const advance = safe(input.advance);
  const additional = safe(input.additional);
  const received = safe(input.received);
  const cashReceived = safe(input.cashReceived);

  const extraIncome = round2(additional + (input.advanceMode === 'extra' ? advance : 0));
  const grossIncome = round2(pairIncome + videoIncome + extraIncome);
  const netIncome = round2(Math.max(0, grossIncome - advance - received));
  const totalReceived = round2(advance + received + cashReceived);
  const remaining = round2(Math.max(0, netIncome - cashReceived));


  return {
    pairIncome,
    videoIncome,
    extraIncome,
    grossIncome,
    advance,
    additional,
    received,
    netIncome,
    cashReceived,
    totalReceived,
    remaining,
    status: getPaymentStatus(grossIncome, totalReceived),
  };
}

/** Relative change in percent (rounded), or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

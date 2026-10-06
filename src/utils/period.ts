import type { Period } from '../types/salary';

const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
const MONTHS_SHORT = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];

export function parsePeriod(period: Period): { year: number; month: number } {
  const [y, m] = period.split('-').map(Number);
  return { year: y, month: m };
}

export function toPeriod(year: number, month: number): Period {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function currentPeriod(date = new Date()): Period {
  return toPeriod(date.getFullYear(), date.getMonth() + 1);
}

export function shiftPeriod(period: Period, delta: number): Period {
  const { year, month } = parsePeriod(period);
  const idx = year * 12 + (month - 1) + delta;
  return toPeriod(Math.floor(idx / 12), (idx % 12) + 1);
}

/** "2026-10" → "Жовтень 2026" */
export function formatPeriod(period: Period): string {
  const { year, month } = parsePeriod(period);
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatMonth(period: Period): string {
  return MONTHS[parsePeriod(period).month - 1];
}

export function formatMonthShort(period: Period): string {
  return MONTHS_SHORT[parsePeriod(period).month - 1];
}

/** "2026-10" → "01.10.2026" */
export function formatPeriodDate(period: Period): string {
  const { year, month } = parsePeriod(period);
  return `01.${String(month).padStart(2, '0')}.${year}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

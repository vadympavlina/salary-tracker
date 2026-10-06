import type { SalaryProfile, SalarySettings } from '../types/salary';

export const DEFAULT_SETTINGS: SalarySettings = {
  pairRate: 400,
  videoRate: 50,
  advanceMode: 'part',
  defaultAdvance: 0,
  defaultCard: 15961,
  theme: 'light',
};

export const DEFAULT_PROFILE: SalaryProfile = {
  firstName: 'Вадим',
  fullName: 'Vadym Pavlina',
};

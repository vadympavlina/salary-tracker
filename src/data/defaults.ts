import type { SalaryProfile, SalarySettings } from '../types/salary';

export const DEFAULT_SETTINGS: SalarySettings = {
  pairRate: 350,
  videoRate: 45,
  advanceMode: 'part',
  defaultAdvance: 0,
};

export const DEFAULT_PROFILE: SalaryProfile = {
  firstName: 'Вадим',
  fullName: 'Vadym Pavlina',
};

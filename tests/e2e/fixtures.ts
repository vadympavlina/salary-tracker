import { test as base, expect } from '@playwright/test';

/**
 * Specs run on a fixed "today" (27 Oct 2026): the sample months end in October, and the app's
 * "this month" logic (home counter, next-month buttons, "+ Листопад") must not depend on the
 * real date the suite happens to run on.
 */
export const TEST_NOW = new Date('2026-10-27T12:00:00');

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(TEST_NOW);
    await use(page);
  },
});

export { expect };

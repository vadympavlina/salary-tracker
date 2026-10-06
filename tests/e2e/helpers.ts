import { expect, type Locator, type Page } from '@playwright/test';

const NB = ' ';
/** "28 450" → "28 450 ₴" with the app's non-breaking spaces. */
export const uah = (s: string) => s.replace(/ /g, NB) + NB + '₴';
export const nb = (s: string) => s.replace(/ /g, NB);

export const field = (page: Page, label: string) => page.getByLabel(label, { exact: true });

/** Fails on uncaught errors and console errors for the whole test. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return () => expect(errors, 'browser errors').toEqual([]);
}

/** The element is inside the viewport and is what a tap at its center would hit (not hidden under a bar). */
export async function expectTappable(locator: Locator) {
  await expect(locator).toBeVisible();
  // Polls: scrolling, page transitions and sticky bars settle at different speeds per engine.
  await expect
    .poll(
      () =>
        locator.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return 'outside viewport';
          const top = document.elementFromPoint(x, y);
          return top && (el === top || el.contains(top)) ? 'ok' : `covered by ${top?.className || top?.tagName}`;
        }),
      { timeout: 4000 },
    )
    .toBe('ok');
}

/** Scrolls to the very bottom and waits until the scroll position has settled. */
export async function scrollToBottom(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          window.scrollTo(0, document.documentElement.scrollHeight);
          return Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) <= 2;
        }),
      { timeout: 4000 },
    )
    .toBe(true);
}

/** Waits until the app has finished its first load (including seeding demo data). */
export async function appReady(page: Page) {
  await expect(page.locator('main h1').first()).toBeVisible();
}

/** Ends running number animations so screenshots/asserts see final values. */
export async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(450);
}

/** Use the in-memory Firebase stand-in instead of the real network (see src/services/cloud/fakeBackend.ts). */
export async function offlineCloud(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __SALARY_FAKE_CLOUD__: boolean }).__SALARY_FAKE_CLOUD__ = true;
  });
}

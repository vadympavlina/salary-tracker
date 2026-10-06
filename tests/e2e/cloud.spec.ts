import { test, expect, type Page } from '@playwright/test';
import { appReady, field } from './helpers';
import { buildRecord } from '../../src/services/storage/salaryStorage';
import { SAMPLE_INPUTS } from '../fixtures/sampleMonths';
import { currentPeriod } from '../../src/utils/period';

/**
 * Sign-in + sync against an in-memory stand-in for Firebase (src/services/cloud/fakeBackend.ts).
 * The fake keeps "the cloud" in localStorage['fake_cloud'], so tests can pre-fill what another
 * device uploaded and inspect what this device sent.
 */
const EMAIL = 'me@test.ua';
const PASSWORD = 'secret-1';

async function useFakeCloud(page: Page, cloudData: object = {}) {
  await page.addInitScript(
    ({ email, password, data }) => {
      (window as unknown as { __SALARY_FAKE_CLOUD__: boolean }).__SALARY_FAKE_CLOUD__ = true;
      if (!localStorage.getItem('fake_cloud')) {
        localStorage.setItem('fake_cloud', JSON.stringify({ users: { [email]: { password, uid: 'u1' } }, data: { u1: data }, session: null }));
      }
    },
    { email: EMAIL, password: PASSWORD, data: cloudData },
  );
}

const cloud = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('fake_cloud') || '{}').data?.u1 ?? {});

async function signIn(page: Page, password = PASSWORD) {
  await page.getByLabel('Email', { exact: true }).fill(EMAIL);
  await page.getByLabel('Пароль', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Увійти' }).click();
}

test.describe('fresh device', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('sign in downloads months and settings saved from another device', async ({ page }) => {
    const other = { ...buildRecord(SAMPLE_INPUTS[4]), id: 'other-1', updatedAt: '2026-09-30T18:00:00.000Z' };
    await useFakeCloud(page, {
      records: { [other.period]: other },
      settings: { data: { pairRate: 420, videoRate: 50, advanceMode: 'part', defaultAdvance: 0, defaultCard: 15961, theme: 'light' }, updatedAt: '2026-10-01T00:00:00.000Z' },
    });
    await page.goto('./');

    await signIn(page, 'wrong');
    await expect(page.getByRole('alert')).toHaveText('Невірний email або пароль');
    await signIn(page);

    await appReady(page);
    await page.goto('#/history');
    await expect(page.getByRole('link', { name: /Вересень 2026/ })).toBeVisible();
    await page.goto('#/settings');
    await expect(page.getByRole('button', { name: /Ставка за пару.*420/ })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`${EMAIL}.*Синхронізовано`) })).toBeVisible();
  });

  test('local edits are uploaded; sign-out clears the device, sign-in brings data back', async ({ page }) => {
    await useFakeCloud(page);
    await page.goto('./');
    await signIn(page);
    await appReady(page);

    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Пари: плюс один' }).click();
    const period = currentPeriod();
    await expect.poll(async () => (await cloud(page)).records?.[period]?.pairItems?.[0]?.count, { timeout: 5000 }).toBe(4);

    // Deleting a month reaches the cloud as a tombstone.
    await page.goto('#/history');
    await page.locator('.history-item').first().click();
    await page.getByRole('button', { name: 'Видалити' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click();
    await expect.poll(async () => (await cloud(page)).records?.[period]?.deleted, { timeout: 5000 }).toBe(true);
    await page.getByRole('button', { name: 'Скасувати' }).click(); // undo → back in the cloud
    await expect.poll(async () => (await cloud(page)).records?.[period]?.pairItems?.[0]?.count, { timeout: 5000 }).toBe(4);

    await page.goto('#/settings');
    await page.getByRole('button', { name: 'Вийти' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Вийти' }).click();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('salary_records'))).toBeNull();

    await signIn(page);
    await appReady(page);
    await page.goto('./');
    await expect(page.locator('.counter .counter__value').first()).toContainText('4');
  });
});

test('months entered without signing in are uploaded on first sign-in', async ({ page }) => {
  // Starts from the 6 sample months in local-only mode (global storage state).
  await useFakeCloud(page);
  await page.goto('#/settings');
  await page.getByRole('button', { name: /Увійти для синхронізації/ }).click();
  await signIn(page);
  await appReady(page);
  await expect.poll(async () => Object.keys((await cloud(page)).records ?? {}).length, { timeout: 5000 }).toBe(6);
  await page.goto('#/history');
  await expect(page.locator('.history-item')).toHaveCount(6);
  await expect(field(page, 'Кількість пар')).toHaveCount(0);
});

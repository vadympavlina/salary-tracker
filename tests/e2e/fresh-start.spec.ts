import { test, expect } from '@playwright/test';
import { appReady, field, nb, offlineCloud, trackErrors, uah } from './helpers';

// A brand-new install: no sample data at all (and no real network to Firebase).
test.use({ storageState: { cookies: [], origins: [] } });
test.beforeEach(({ page }) => offlineCloud(page));

test('first launch: sign-in screen, "continue without signing in" works', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Зарплата', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page.getByRole('alert')).toHaveText('Введи email і пароль');
  await page.getByRole('button', { name: /Продовжити без входу/ }).click();
  await expect(page.getByRole('heading', { name: /Привіт/ })).toBeVisible();
  // Remembered across launches.
  await page.reload();
  await expect(page.getByRole('heading', { name: /Привіт/ })).toBeVisible();
});

test('first launch: empty, real defaults (400 / 50, card 15 961, no advance)', async ({ page }) => {
  const assertNoErrors = trackErrors(page);
  await page.goto('./');
  await page.getByRole('button', { name: /Продовжити без входу/ }).click();
  await appReady(page);
  await expect(page.getByText('Поки що немає розрахунків')).toBeVisible();
  await expect(page.getByText(/демо/i)).toHaveCount(0);

  await page.goto('#/calculate?new=1');
  await expect(field(page, 'Ставка за пару')).toHaveValue('400');
  await expect(field(page, 'Ставка за відео')).toHaveValue('50');
  await expect(field(page, 'Аванс')).toHaveValue('');
  await expect(field(page, 'На картку')).toHaveValue(nb('15 961'));

  // 20 × 400 + 400 × 50 = 28 000; на руки = 28 000 − 15 961 = 12 039
  await field(page, 'Кількість пар').fill('20');
  await field(page, 'Перевірені відео').fill('400');
  await expect(page.locator('.hand-callout b')).toHaveText(uah('12 039'));

  await page.goto('#/settings');
  await expect(page.getByRole('button', { name: /Сума на картку.*15\s961/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Типовий аванс.*Немає/ })).toBeVisible();
  await expect(page.getByText('Очистити демо-дані')).toHaveCount(0);
  assertNoErrors();
});

test('counter on a fresh install creates the month with the standard card amount', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Продовжити без входу/ }).click();
  await appReady(page);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Пари: плюс один' }).click();
  await expect(page.locator('.counter .counter__value').first()).toContainText('3');
  await page.getByRole('link', { name: 'Новий розрахунок' }).first().click();
  await expect(field(page, 'Кількість пар')).toHaveValue('3');
  await expect(field(page, 'Ставка за пару')).toHaveValue('400');
  await expect(field(page, 'На картку')).toHaveValue(nb('15 961'));
});

test('old demo rows are removed on update, own months stay', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Продовжити без входу/ }).click();
  await appReady(page);
  await page.evaluate(() => {
    localStorage.setItem('salary_meta', JSON.stringify({ schemaVersion: 2, seeded: true }));
    localStorage.setItem(
      'salary_records',
      JSON.stringify([
        { period: '2026-09', pairs: 11, pairRate: 350, isDemo: true },
        { period: '2026-08', pairs: 5, pairRate: 400, note: 'моє' },
      ]),
    );
  });
  await page.reload();
  await appReady(page);
  await page.goto('#/history');
  await expect(page.locator('.history-item')).toHaveCount(1);
  await expect(page.getByText('Серпень 2026')).toBeVisible();
});

import { test, expect } from '@playwright/test';
import { appReady, field, settle, trackErrors, uah } from './helpers';

test('month counter: +1 / −1 on the home screen, survives reload', async ({ page }) => {
  const assertNoErrors = trackErrors(page);
  await page.goto('./');
  const counter = page.locator('.counter');
  await expect(counter.getByRole('heading', { name: 'Цей місяць' })).toBeVisible();
  const pairs = counter.locator('.counter__row').nth(0).locator('.counter__value');
  const videos = counter.locator('.counter__row').nth(1).locator('.counter__value');
  const startPairs = Number((await pairs.innerText()).replace(/\D/g, ''));
  const startVideos = Number((await videos.innerText()).replace(/\D/g, ''));

  // Rapid taps must all count.
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Пари: плюс один' }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Відео: плюс один' }).click();
  await page.getByRole('button', { name: 'Відео: мінус один' }).click();
  await expect(pairs).toContainText(String(startPairs + 3));
  await expect(videos).toContainText(String(startVideos + 4));

  await page.reload();
  await expect(page.locator('.counter .counter__value').nth(0)).toContainText(String(startPairs + 3));
  await expect(page.locator('.counter .counter__value').nth(1)).toContainText(String(startVideos + 4));

  // "Новий розрахунок" for this month continues from the counted values instead of wiping them.
  await page.getByRole('link', { name: 'Новий розрахунок' }).first().click();
  await expect(page.getByLabel('Кількість пар', { exact: true })).toHaveValue(String(startPairs + 3));
  await expect(page.getByLabel('Перевірені відео', { exact: true })).toHaveValue(String(startVideos + 4));
  assertNoErrors();
});

test('month counter starts the month when there is no record yet', async ({ page }) => {
  await page.goto('./');
  await appReady(page); // let first-launch demo seeding finish before wiping it
  await page.evaluate(() => {
    localStorage.setItem('salary_records', '[]');
  });
  await page.reload();
  await expect(page.getByText('Поки що немає розрахунків')).toBeVisible();
  await page.getByRole('button', { name: 'Пари: плюс один' }).click();
  await page.getByRole('button', { name: 'Пари: плюс один' }).click();
  await expect(page.locator('.counter .counter__value').first()).toContainText('2');
  await expect(page.locator('.hero__amount')).toBeVisible(); // the month now exists
  await page.goto('#/history');
  await expect(page.locator('.history-item')).toHaveCount(1);
});

test('several rates in one month + note', async ({ page }) => {
  const assertNoErrors = trackErrors(page);
  await page.goto('#/calculate?new=1');
  await page.getByRole('button', { name: 'Наступний місяць' }).click();
  await field(page, 'Кількість пар').fill('8');
  await page.getByRole('button', { name: 'Інша ставка: пари' }).click();
  await field(page, 'Кількість пар (ставка 2)').fill('4');
  await field(page, 'Ставка за пару 2').fill('400');
  await field(page, 'Перевірені відео').fill('100');
  await field(page, 'Коментар до місяця').fill('Нова ставка з 15-го');
  // 8×350 + 4×400 + 100×45 = 2800 + 1600 + 4500
  await expect(page.locator('.hand-callout b')).toHaveText(uah('8 900'));

  await page.getByRole('button', { name: 'Розрахувати' }).click();
  const breakdown = page.locator('.breakdown');
  await expect(breakdown.getByText(`8 × ${uah('350')}`)).toBeVisible();
  await expect(breakdown.getByText(`4 × ${uah('400')}`)).toBeVisible();
  await expect(breakdown.getByText('Пари разом')).toBeVisible();
  await expect(page.locator('.note')).toContainText('Нова ставка з 15-го');

  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByText('Розрахунок успішно збережено')).toBeVisible();
  await expect(page.locator('.note')).toContainText('Нова ставка з 15-го');

  // Edit keeps both lines; removing the extra line drops it.
  await page.getByRole('button', { name: 'Редагувати' }).click();
  await expect(field(page, 'Кількість пар (ставка 2)')).toHaveValue('4');
  await page.getByRole('button', { name: /Прибрати ставку 2/ }).click();
  await expect(field(page, 'Кількість пар (ставка 2)')).toHaveCount(0);
  await expect(page.locator('.hand-callout b')).toHaveText(uah('7 300'));
  assertNoErrors();
});

test('theme: light by default, dark and system from settings, no flash on reload', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('#/settings');
  await page.getByRole('button', { name: /^Тема/ }).click();
  await page.getByRole('dialog').getByRole('radio', { name: 'Темна', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(0, 0, 0)');
  await page.getByRole('dialog').getByRole('button', { name: 'Готово' }).click();
  await expect(page.getByRole('button', { name: /Тема.*Темна/ })).toBeVisible();

  // The inline boot script applies it before React mounts.
  await page.reload({ waitUntil: 'commit' });
  await page.waitForSelector('html[data-theme="dark"]', { timeout: 2000 });

  // System follows the OS.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('button', { name: /^Тема/ }).click();
  await page.getByRole('dialog').getByRole('radio', { name: 'Системна' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('dark theme: every page renders cleanly', async ({ page }, testInfo) => {
  await page.goto('./');
  await appReady(page);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('salary_settings') || '{}');
    localStorage.setItem('salary_settings', JSON.stringify({ ...s, theme: 'dark' }));
  });
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('salary_records') || '[]')[0].id as string);
  for (const [name, path] of [['Головна', './'], ['Розрахунок', '#/calculate?new=1'], ['Історія', '#/history'], ['Деталі', `#/history/${id}`], ['Аналітика', '#/analytics'], ['Налаштування', '#/settings']]) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await settle(page);
    // No white cards left behind in dark mode.
    const light = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.card, .list-card, .stat, .field__box, .segmented')]
        .filter((el) => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)')
        .map((el) => el.className),
    );
    expect(light, `${name}: light surfaces in dark theme`).toEqual([]);
    await testInfo.attach(`dark-${name}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
});

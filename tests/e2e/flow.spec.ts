import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { field, nb, trackErrors, uah } from './helpers';

test('full flow: create → calculate → save → history → edit → delete → analytics → export → import', async ({ page }) => {
  const assertNoErrors = trackErrors(page);

  // 1. First launch → demo data
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Привіт, Вадим/ })).toBeVisible();
  await expect(page.locator(`.hero__amount[data-value="${uah('8 450')}"]`)).toBeVisible();

  // 2. New calculation for November 2026
  await page.getByRole('link', { name: 'Новий розрахунок' }).first().click();
  await expect(page.getByRole('heading', { name: 'Розрахунок', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Наступний місяць' }).click();
  await expect(page.getByText('Листопад 2026')).toBeVisible();
  const plus = page.getByRole('button', { name: 'Збільшити: Кількість пар' });
  for (let i = 0; i < 12; i++) await plus.click();
  await expect(field(page, 'Кількість пар')).toHaveValue('12');
  await field(page, 'Перевірені відео').fill('248');
  await field(page, 'Аванс').fill('5000');
  await expect(field(page, 'Аванс')).toHaveValue(nb('5 000'));
  await field(page, 'Додаткові').fill('1200');
  await field(page, 'Сума, яка прийшла на картку').fill('10000');
  await expect(page.locator('.hand-callout b')).toHaveText(uah('1 560'));
  await expect(page.locator('.live-total b')).toHaveText(uah('1 560'));

  // 3. Result
  await page.getByRole('button', { name: 'Розрахувати' }).click();
  await expect(page.getByRole('heading', { name: 'Результат' })).toBeVisible();
  const breakdown = page.locator('.breakdown');
  for (const v of ['4 200', '11 160', '16 560', '1 560']) await expect(breakdown.getByText(uah(v)).first()).toBeVisible();
  await expect(breakdown.getByText('−' + uah('10 000'))).toBeVisible();

  // 4. Save → details
  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByText('Розрахунок успішно збережено')).toBeVisible();
  await expect(page.locator('.hero').getByText('Частково')).toBeVisible();

  // 5. Deep-link refresh + history filter
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Деталі розрахунку' })).toBeVisible();
  await page.goto('#/history');
  await expect(page.getByRole('link', { name: /Листопад 2026/ })).toBeVisible();
  await page.getByRole('radio', { name: /В очікуванні/ }).click();
  await expect(page.locator('.history-item')).toHaveCount(2);
  await page.getByRole('radio', { name: /Всі/ }).click();

  // 6. Edit: cash received in hand → paid
  await page.getByRole('link', { name: /Листопад 2026/ }).click();
  await page.getByRole('button', { name: 'Редагувати' }).click();
  await expect(page.getByRole('heading', { name: 'Редагування' })).toBeVisible();
  await expect(field(page, 'Перевірені відео')).toHaveValue('248');
  await page.getByRole('button', { name: 'Отримав усе' }).click();
  await expect(field(page, 'Отримано на руки')).toHaveValue(nb('1 560'));
  await page.getByRole('button', { name: 'Розрахувати' }).click();
  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.locator('.hero').getByText('Виплачено')).toBeVisible();

  // 7. Delete → undo → delete
  await page.getByRole('button', { name: 'Видалити' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click();
  await expect(page.getByRole('heading', { name: 'Історія' })).toBeVisible();
  await page.getByRole('button', { name: 'Скасувати' }).click();
  await page.getByRole('link', { name: /Листопад 2026/ }).click();
  await page.getByRole('button', { name: 'Видалити' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click();
  await expect(page.getByRole('heading', { name: 'Історія' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Листопад 2026/ })).toHaveCount(0);

  // 8. Analytics
  await page.getByRole('link', { name: 'Аналітика' }).first().click();
  await expect(page.getByText('Динаміка доходу')).toBeVisible();
  await expect(page.locator('.bar')).toHaveCount(6);
  await page.getByRole('radio', { name: 'Пари' }).click();
  await expect(page.getByRole('heading', { name: 'Кількість пар' })).toBeVisible();
  await page.getByRole('radio', { name: 'Відео' }).click();
  await expect(page.getByRole('heading', { name: 'Перевірені відео' })).toBeVisible();

  // 9. Settings: new default rate
  await page.getByRole('link', { name: 'Профіль' }).first().click();
  await page.getByRole('button', { name: /Ставка за пару/ }).click();
  await page.getByRole('dialog').getByLabel('Ставка за пару').fill('400');
  await page.getByRole('dialog').getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByRole('button', { name: /Ставка за пару.*400/ })).toBeVisible();

  // 10. Export → wipe → import
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Експорт даних/ }).click()]);
  const exported = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(exported.records).toHaveLength(6);
  expect(exported.settings.pairRate).toBe(400);
  await page.getByRole('button', { name: /Видалити всі дані/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Видалити все' }).click();
  await page.goto('#/history');
  await expect(page.getByText('Поки що немає розрахунків')).toBeVisible();
  await page.goto('#/settings');
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  await page.getByRole('dialog').getByRole('button', { name: 'Замінити' }).click();
  await expect(page.getByRole('button', { name: /Ставка за пару.*400/ })).toBeVisible();
  await page.goto('#/history');
  await expect(page.locator('.history-item')).toHaveCount(6);

  // 11. A month without data starts from the new default rate…
  await page.goto('#/calculate?new=1');
  await page.getByRole('button', { name: 'Наступний місяць' }).click();
  await expect(field(page, 'Ставка за пару')).toHaveValue('400');
  // …while a month that already has data opens filled in (never wiped by "new").
  await page.getByRole('button', { name: 'Попередній місяць' }).click();
  await expect(page.getByText(/вже є дані/)).toBeVisible();
  await expect(field(page, 'Ставка за пару')).toHaveValue('350');

  assertNoErrors();
});

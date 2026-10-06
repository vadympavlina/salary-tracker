// End-to-end smoke test of the main user flow against the production build.
// Usage: npm run build && npx vite preview --port 4173 & node scripts/e2e.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const BASE = process.env.E2E_URL ?? 'http://localhost:4173/salary-tracker/';
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const NB = ' ';
const uah = (s) => s.replace(/ /g, NB) + NB + '₴';

const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const step = (name) => console.log('✓', name);
const field = (label) => page.getByLabel(label, { exact: true });

// 1. First launch → demo data
await page.goto(BASE);
await page.getByRole('heading', { name: /Привіт, Вадим/ }).waitFor();
await page.locator(`.hero__amount[aria-label="${uah('8 450')}"]`).waitFor();
assert.ok(await page.locator('.hero').getByText(uah('28 450')).isVisible());
step('home with demo data');

// 2. New calculation for November 2026
await page.getByRole('link', { name: 'Новий розрахунок' }).first().click();
await page.getByRole('heading', { name: 'Розрахунок' }).waitFor();
await page.getByRole('button', { name: 'Наступний місяць' }).click();
await page.getByText('Листопад 2026').waitFor();
for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Збільшити: Кількість пар' }).click();
assert.equal(await field('Кількість пар').inputValue(), '12');
await field('Перевірені відео').fill('248');
await field('Аванс').fill('5000');
await field('Додаткові').fill('1200');
assert.equal(await field('Аванс').inputValue(), `5${NB}000`);
await field('Сума, яка прийшла на картку').fill('10000');
await page.locator('.live-total b').getByText(uah('1 560')).waitFor();
await page.locator('.hand-callout').getByText(uah('1 560')).waitFor();
step('form input + live total');

// 3. Result
await page.getByRole('button', { name: 'Розрахувати' }).click();
await page.getByRole('heading', { name: 'Результат' }).waitFor();
const breakdown = page.locator('.breakdown');
for (const v of ['4 200', '11 160', '16 560', '1 560']) assert.ok(await breakdown.getByText(uah(v)).first().isVisible(), v);
assert.ok(await breakdown.getByText('−10' + NB + '000' + NB + '₴').isVisible());
await page.locator(`.hero__amount[aria-label="${uah('1 560')}"]`).waitFor();
step('result breakdown');

// 4. Save → details
await page.getByRole('button', { name: 'Зберегти' }).click();
await page.getByText('Розрахунок успішно збережено').waitFor();
assert.ok(await page.locator('.hero').getByText('Частково').isVisible());
step('saved, status partial');

// 5. History has it, refresh on deep link works
await page.reload();
await page.getByRole('heading', { name: 'Деталі розрахунку' }).waitFor();
await page.goto(BASE + 'history');
await page.getByRole('link', { name: /Листопад 2026/ }).waitFor();
await page.getByRole('radio', { name: /В очікуванні/ }).click();
assert.equal(await page.locator('.history-item').count(), 2);
step('history + filter + deep-link refresh');

// 6. Edit
await page.getByRole('link', { name: /Листопад 2026/ }).click();
await page.getByRole('button', { name: 'Редагувати' }).click();
await page.getByRole('heading', { name: 'Редагування' }).waitFor();
assert.equal(await field('Перевірені відео').inputValue(), '248');
await page.getByRole('button', { name: 'Отримав усе' }).click();
assert.equal(await field('Отримано на руки').inputValue(), `1${NB}560`);
await page.getByRole('button', { name: 'Розрахувати' }).click();
await page.getByRole('button', { name: 'Зберегти' }).click();
await page.locator('.hero').getByText('Виплачено').waitFor();
step('edit → paid');

// 7. Delete + undo + delete
await page.getByRole('button', { name: 'Видалити' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click();
await page.getByRole('heading', { name: 'Історія' }).waitFor();
await page.getByRole('radio', { name: /Всі/ }).click();
await page.getByRole('button', { name: 'Скасувати' }).click();
await page.getByRole('link', { name: /Листопад 2026/ }).waitFor();
await page.getByRole('link', { name: /Листопад 2026/ }).click();
await page.getByRole('button', { name: 'Видалити' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click();
await page.getByRole('heading', { name: 'Історія' }).waitFor();
await page.waitForTimeout(300);
assert.equal(await page.getByRole('link', { name: /Листопад 2026/ }).count(), 0);
step('delete + undo');

// 8. Analytics
await page.getByRole('link', { name: 'Аналітика' }).first().click();
await page.getByText('Динаміка доходу').waitFor();
assert.equal(await page.locator('.bar').count(), 6);
await page.getByRole('radio', { name: 'Пари' }).click();
await page.getByText('Кількість пар').waitFor();
await page.getByRole('radio', { name: 'Відео' }).click();
await page.getByText('Перевірені відео').first().waitFor();
step('analytics tabs');

// 9. Settings: rate change applies to new calc
await page.getByRole('link', { name: 'Профіль' }).first().click();
await page.getByRole('button', { name: /Ставка за пару/ }).click();
await page.getByRole('dialog').getByLabel('Ставка за пару').fill('400');
await page.getByRole('dialog').getByRole('button', { name: 'Зберегти' }).click();
await page.getByRole('button', { name: /Ставка за пару.*400/ }).waitFor();
step('settings rate');

// 10. Export → wipe → import
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Експорт даних/ }).click()]);
const exported = JSON.parse(readFileSync(await download.path(), 'utf8'));
assert.equal(exported.records.length, 6);
assert.equal(exported.settings.pairRate, 400);
await page.getByRole('button', { name: /Видалити всі дані/ }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Видалити все' }).click();
await page.goto(BASE + 'history');
await page.getByText('Поки що немає розрахунків').waitFor();
await page.goto(BASE + 'settings');
await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
await page.getByRole('dialog').getByRole('button', { name: 'Замінити' }).click();
await page.getByRole('button', { name: /Ставка за пару.*400/ }).waitFor();
await page.goto(BASE + 'history');
assert.equal(await page.locator('.history-item').count(), 6);
step('export → clear → import');

// 11. New calc picks up the new default rate
await page.goto(BASE + 'calculate?new=1');
assert.equal(await field('Ставка за пару').inputValue(), '400');
step('default rate prefilled');

assert.deepEqual(errors, [], 'console errors');
console.log('\nAll e2e checks passed');
await browser.close();

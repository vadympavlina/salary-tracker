import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { appReady, settle } from './helpers';

// Accessibility audit (WCAG 2.1 A/AA: contrast, labels, roles, names…) on one phone and one desktop.
const AUDITED = ['iPhone 15 · 393', 'Laptop · 1280'];

for (const theme of ['light', 'dark'] as const) {
  test(`accessibility (${theme} theme): every page passes axe`, async ({ page }, testInfo) => {
    test.skip(!AUDITED.includes(testInfo.project.name), 'audited on a representative phone + desktop');
    await page.goto('./');
    await appReady(page);
    await page.evaluate((t) => {
      const s = JSON.parse(localStorage.getItem('salary_settings') || '{}');
      localStorage.setItem('salary_settings', JSON.stringify({ ...s, theme: t }));
    }, theme);
    const id = await page.evaluate(() => JSON.parse(localStorage.getItem('salary_records') || '[]')[0].id as string);

    const pages = [
      ['Головна', './'],
      ['Розрахунок', 'calculate?new=1'],
      ['Історія', 'history'],
      ['Деталі', `history/${id}`],
      ['Аналітика', 'analytics'],
      ['Налаштування', 'settings'],
    ];
    const problems: string[] = [];
    for (const [name, path] of pages) {
      await page.goto(path);
      await settle(page);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      for (const v of violations) {
        problems.push(`${name}: [${v.id}] ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      }
    }
    // Result page + an open dialog
    await page.goto('calculate?new=1');
    await page.getByRole('button', { name: 'Розрахувати' }).click();
    await settle(page);
    for (const v of (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations) {
      problems.push(`Результат: [${v.id}] ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    await page.goto('settings');
    await page.getByRole('button', { name: /Режим авансу/ }).click();
    await page.waitForTimeout(450);
    for (const v of (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations) {
      problems.push(`Діалог: [${v.id}] ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
    expect(problems).toEqual([]);
  });
}

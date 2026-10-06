import { test, expect, type Page } from '@playwright/test';
import { expectTappable, field, settle, trackErrors } from './helpers';

const PAGES = [
  { name: 'Головна', path: './', heading: /Привіт/ },
  { name: 'Розрахунок', path: 'calculate?new=1', heading: 'Розрахунок' },
  { name: 'Історія', path: 'history', heading: 'Історія' },
  { name: 'Деталі', path: 'history/:first', heading: 'Деталі розрахунку', pushed: true },
  { name: 'Аналітика', path: 'analytics', heading: 'Аналітика' },
  { name: 'Налаштування', path: 'settings', heading: 'Налаштування' },
];

async function firstRecordId(page: Page) {
  await page.goto('./');
  return page.evaluate(() => JSON.parse(localStorage.getItem('salary_records') || '[]')[0]?.id as string);
}

/** Which navigation the layout shows: bottom tab bar (phones/tablets), icon rail (phone landscape) or sidebar (desktop). */
async function navMode(page: Page) {
  return page.evaluate(() => {
    const visible = (sel: string) => {
      const el = document.querySelector(sel);
      return !!el && getComputedStyle(el).display !== 'none';
    };
    if (visible('.tabbar')) return 'tabbar';
    const sb = document.querySelector('.sidebar');
    if (sb && getComputedStyle(sb).display !== 'none') return sb.getBoundingClientRect().width < 120 ? 'rail' : 'sidebar';
    return 'none';
  });
}

for (const p of PAGES) {
  test(`${p.name}: layout fits the screen`, async ({ page }, testInfo) => {
    const assertNoErrors = trackErrors(page);
    const id = await firstRecordId(page);
    await page.goto(p.path.replace(':first', id));
    await expect(page.getByRole('heading', { name: p.heading, level: 1 })).toBeVisible();
    await settle(page);

    // No sideways scrolling, ever.
    const overflow = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(overflow.content, 'horizontal overflow').toBeLessThanOrEqual(overflow.viewport);

    // Exactly one navigation, with all five destinations reachable.
    // Pushed screens (details) hide the tab bar like iOS and offer a back button instead.
    const mode = await navMode(page);
    const vw = page.viewportSize()!;
    const expected = vw.width >= 1024 ? 'sidebar' : vw.height <= 520 && vw.width > vw.height ? 'rail' : 'tabbar';
    if (p.pushed && expected === 'tabbar') {
      expect(mode).toBe('none');
      await expectTappable(page.getByRole('button', { name: 'Назад' }));
    } else {
      expect(mode).toBe(expected);
      const nav = page.getByRole('navigation', { name: 'Основна навігація' }).filter({ visible: true });
      await expect(nav).toHaveCount(1);
      for (const label of ['Головна', 'Розрахунок', 'Історія', 'Аналітика', 'Профіль']) {
        await expect(nav.getByRole('link', { name: label })).toBeVisible();
      }
    }

    // Touch screens: every control is at least 44×44 (input text boxes are covered by their 72px tappable card).
    if (testInfo.project.use.hasTouch) {
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button, a[href], [role=radio], [role=button]')]
          .filter((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && !el.closest('.skip-link, .bar-chart, dialog:not([open])');
          })
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width < 43.5 || r.height < 43.5)
          .map(({ el, r }) => `${(el.textContent || el.getAttribute('aria-label') || el.className).trim().slice(0, 24)} ${Math.round(r.width)}×${Math.round(r.height)}`),
      );
      expect(small, 'touch targets smaller than 44px').toEqual([]);
    }

    // Text that is cut with an ellipsis means the layout is too tight.
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.history-item__title, .stat__value, .money__cell dd, .live-total b, .hero__amount, .page-header__title')]
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent?.trim()),
    );
    expect(clipped, 'clipped text').toEqual([]);

    await testInfo.attach(`${p.name}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    assertNoErrors();
  });
}

test('primary actions stay reachable above the bars', async ({ page }) => {
  // Calculate: the sticky "Розрахувати" is on screen without scrolling.
  await page.goto('calculate?new=1');
  await expectTappable(page.getByRole('button', { name: 'Розрахувати' }));
  // ...and still after scrolling to the bottom of the form.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expectTappable(page.getByRole('button', { name: 'Розрахувати' }));
  // The last field can be scrolled to a spot where the sticky bars don't cover it.
  await page.locator('.field__box').last().evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expectTappable(page.locator('.field__box').last());

  // Result: Save is on screen and not under anything.
  await field(page, 'Кількість пар').fill('12');
  await page.getByRole('button', { name: 'Розрахувати' }).click();
  await expectTappable(page.getByRole('button', { name: 'Зберегти' }));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expectTappable(page.getByRole('button', { name: 'Зберегти' }));
  // The last breakdown row is not hidden behind the sticky buttons.
  await expectTappable(page.locator('.bd-row').last());
});

test('the end of long lists is not hidden behind the tab bar', async ({ page }) => {
  await page.goto('history');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  await expectTappable(page.locator('.history-item').last());

  await page.goto('settings');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(200);
  await expectTappable(page.getByRole('button', { name: /Видалити всі дані/ }));
});

test('dialogs fit the viewport and close with Escape', async ({ page }) => {
  await page.goto('settings');
  await page.getByRole('button', { name: /Ставка за пару/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(450); // sheet animation
  const box = await page.locator('.modal__panel').boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
  await expectTappable(dialog.getByRole('button', { name: 'Зберегти' }));
  await expect(dialog.getByLabel('Ставка за пару')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('keyboard: skip link and focus order', async ({ page }, testInfo) => {
  test.skip(!!testInfo.project.use.isMobile, 'hardware keyboard scenario');
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Перейти до вмісту' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

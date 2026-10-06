# Зарплата — облік і розрахунок

Персональний mobile-first PWA для щомісячного розрахунку зарплати: пари, перевірені відео, аванс, додаткові виплати, фактична сума на картці → скільки заробив, отримав і скільки ще має прийти. Історія, аналітика, експорт/імпорт JSON. Працює офлайн і встановлюється на головний екран.

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173/salary-tracker/
npm test           # unit-тести розрахунків і сховища
npm run build      # production-збірка в dist/
npm run test:e2e   # e2e + responsive на 11+ пристроях (потрібна збірка)
```

Локально без завантаження браузерів Playwright: `CHROMIUM_PATH=/шлях/до/chrome npm run test:e2e`. WebKit (Safari) запускається в CI або з `PW_WEBKIT=1`.

## Тести на пристроях

`playwright.config.ts` містить матрицю: iPhone SE 1-го покоління (320), SE (375), Android 360, iPhone 15, Pixel 7, Pro Max, телефон у ландшафті, iPad Mini, iPad у ландшафті, ноутбук 1280, монітор 1920; у CI ще Safari на iPhone 15 / SE / iPad / Mac.

- `tests/e2e/flow.spec.ts` — повний сценарій: створення → розрахунок → збереження → історія → редагування → видалення/undo → аналітика → налаштування → експорт → імпорт.
- `tests/e2e/responsive.spec.ts` — на кожній сторінці: немає горизонтального скролу, правильна навігація (tab bar / бокова панель у ландшафті / sidebar), зони дотику ≥ 44px, немає обрізаного тексту, головні кнопки не перекриті панелями, діалоги влазять в екран, клавіатурна навігація. Скриншот кожної сторінки на кожному пристрої — у звіті.

## CI і деплой

`.github/workflows/ci.yml` на кожен push і PR: typecheck, unit-тести, збірка, e2e на Chromium + WebKit; звіт зі скриншотами — артефакт `playwright-report`. Деплой на GitHub Pages — лише з гілки за замовчуванням і лише якщо все зелене.

1. Settings → Pages → **Source: GitHub Actions**.
2. Settings → General → **Default branch: `main`**.

Base path береться з назви репозиторію (`BASE_PATH`). Deep links і refresh працюють завдяки `404.html` (копія `index.html`, генерується під час збірки), офлайн — завдяки service worker (`sw/sw.template.js` → `dist/sw.js`).

## Іконки

Усі іконки генеруються з одного джерела `icons-src/icon.mjs`: `npm run icons` → `favicon.ico` (16/32/48), `favicon.svg`, PNG 16/32, apple-touch-icon 180, PWA 192/512 + maskable, плитка Windows, Safari pinned tab.

## Логіка розрахунку

Ставки вводяться вже без податку; податкова ставка лише довідкова.

```
Всього нараховано = пари × ставка + відео × ставка + додаткові (+ аванс у режимі «додатковий дохід»)
Сума на руки      = нараховано − аванс − прийшло на картку
Залишилось        = на руки − отримано на руки
```

Статус: **Виплачено** — аванс + картка + отримано на руки ≥ нараховано; **Частково** — отримано щось; **Очікується** — нічого не отримано. Режим авансу й податкова ставка зберігаються в кожному записі, тому зміна налаштувань не переписує історію.

## Архітектура

```
src/
  types/                    моделі SalaryRecord, SalarySettings…
  services/calculations/    calculateSalary(), аналітика — чисті функції без UI
  services/storage/         StorageAdapter (localStorage) + salaryStorage (репозиторій, імпорт/експорт)
  hooks/useSalaryStore      React-контекст поверх репозиторію
  router/                   мікро-роутер на History API з урахуванням BASE_URL
  components/ ui | salary | dashboard | history | analytics
  layouts/                  AppLayout, BottomNavigation, Sidebar
  pages/                    екрани
  styles/                   дизайн-токени та стилі
```

Щоб перейти на Firebase, достатньо реалізувати `StorageAdapter` (`get/set/remove`) і передати його в `createSalaryStorage()` — UI та розрахунки не змінюються.

Ключі localStorage: `salary_records`, `salary_settings`, `salary_profile`, `salary_meta`.

# Зарплата — облік і розрахунок

Персональний mobile-first PWA для щомісячного розрахунку зарплати: пари, перевірені відео, аванс, додаткові виплати, фактична сума на картці → скільки заробив, отримав і скільки ще має прийти. Історія, аналітика, експорт/імпорт JSON. Працює офлайн і встановлюється на головний екран.

- **Лічильник «Цей місяць»** на головній: +1 пара / +1 відео по ходу роботи — до кінця місяця розрахунок уже заповнений.
- **Кілька ставок в одному місяці** («Інша ставка»), якщо ставка змінилась посеред місяця.
- **Нотатка до місяця.**
- **Тема:** світла за замовчуванням, темна або системна — у Налаштуваннях.

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

Усі іконки генеруються з одного джерела `icons-src/icon.mjs`: `npm run icons` → `favicon.ico`, `favicon.svg`, PNG 16/32, іконка головного екрана iOS `icons/apple-icon-180.png`, PWA 192/512 + maskable, плитка Windows, Safari pinned tab. Service worker іконок не торкається — iOS бере їх напряму з мережі.

## Логіка розрахунку

```
Всього нараховано = Σ пари × ставка + Σ відео × ставка + додаткові (+ аванс у режимі «додатковий дохід»)
Сума на руки      = нараховано − аванс − прийшло на картку
Залишилось        = на руки − отримано на руки
```

Статус: **Виплачено** — аванс + картка + отримано на руки ≥ нараховано; **Частково** — отримано щось; **Очікується** — нічого не отримано. Режим авансу зберігається в кожному записі, тому зміна налаштувань не переписує історію.

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

### Синхронізація (Firebase Realtime Database)

- Вхід email + пароль (Firebase Auth); користувачі створюються в консолі Firebase → Authentication.
- Дані користувача: `salary/{uid}/records/{YYYY-MM}`, `salary/{uid}/settings`, `salary/{uid}/profile`. Правила бази дозволяють читати/писати лише власний `salary/{uid}`.
- Local-first: застосунок завжди працює з локальної копії (localStorage, миттєво й офлайн), а `src/services/cloud/merge.ts` двосторонньо зливає її з хмарою — новіший `updatedAt` виграє, видалення передаються як «tombstone».
- Firebase SDK завантажується ліниво й лише якщо користувач увійшов; режим «Продовжити без входу» працює зовсім без мережі.
- e2e-тести використовують фейковий бекенд (`window.__SALARY_FAKE_CLOUD__`).

Ключі localStorage: `salary_records`, `salary_settings`, `salary_profile`, `salary_meta`.

# Зарплата — облік і розрахунок

Персональний mobile-first PWA для щомісячного розрахунку зарплати: пари, перевірені відео, аванс, додаткові виплати, фактична сума на картці → скільки заробив, отримав і скільки ще має прийти. Історія, аналітика, експорт/імпорт JSON. Працює офлайн і встановлюється на головний екран.

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173/salary-tracker/
npm test           # unit-тести розрахунків і сховища
npm run build      # production-збірка в dist/
npx vite preview --port 4173 &  npm run e2e   # повний сценарій у Chromium
```

## Деплой на GitHub Pages

1. Settings → Pages → **Source: GitHub Actions**.
2. Push у `main` — workflow `.github/workflows/deploy.yml` протестує, збере й опублікує сайт на `https://<user>.github.io/<repo>/`.

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

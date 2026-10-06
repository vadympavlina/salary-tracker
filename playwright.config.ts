import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * Device matrix for the e2e + responsive suites.
 * Chromium projects always run. WebKit (real Safari engine for iPhone/iPad) runs in CI,
 * or locally with PW_WEBKIT=1 after `npx playwright install webkit`.
 * Set CHROMIUM_PATH to use a pre-installed Chromium instead of Playwright's download.
 */
const chromiumLaunch = process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {};
const withWebkit = !!process.env.CI || !!process.env.PW_WEBKIT;
const base = process.env.BASE_PATH ?? '/salary-tracker/';
const url = `http://localhost:4173${base}`;

const chromium = (name: string, use: Project['use']): Project => ({
  name,
  use: { ...use, browserName: 'chromium', ...chromiumLaunch },
});

const projects: Project[] = [
  // Phones (portrait)
  chromium('iPhone SE 1st gen · 320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }),
  chromium('iPhone SE · 375', { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }),
  chromium('Android small · 360', { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }),
  chromium('iPhone 15 · 393', { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }),
  chromium('Pixel 7 · 412', { ...devices['Pixel 7'] }),
  chromium('iPhone Pro Max · 430', { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }),
  // Phone landscape
  chromium('Phone landscape · 844×390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }),
  // Tablets
  chromium('iPad Mini · 768', { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }),
  chromium('iPad landscape · 1024', { viewport: { width: 1024, height: 768 }, hasTouch: true, deviceScaleFactor: 2 }),
  // Desktops
  chromium('Laptop · 1280', { viewport: { width: 1280, height: 800 } }),
  chromium('Desktop · 1920', { viewport: { width: 1920, height: 1080 } }),
];

if (withWebkit) {
  projects.push(
    { name: 'Safari iPhone 15', use: { ...devices['iPhone 15'] } },
    { name: 'Safari iPhone SE', use: { ...devices['iPhone SE'] } },
    { name: 'Safari iPad', use: { ...devices['iPad (gen 7)'] } },
    { name: 'Safari desktop', use: { ...devices['Desktop Safari'] } },
  );
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: url,
    locale: 'uk-UA',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Tests run against the production build, exactly as served on GitHub Pages.
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects,
});

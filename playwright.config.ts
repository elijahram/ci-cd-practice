import { defineConfig, devices } from '@playwright/test';

// BASE_URL decides WHERE Playwright points the browser:
//   - not set  -> start `vite preview` locally and test the built dist/ folder
//   - set      -> test a real deployed site, e.g. the Development GitHub Pages URL
const deployedUrl = process.env.BASE_URL;
const localUrl = 'http://localhost:4173/';

export default defineConfig({
  testDir: './tests/e2e',
  // Fail the CI run if someone accidentally commits `test.only`.
  forbidOnly: !!process.env.CI,
  // Deployed sites can have brief network hiccups; retry once in CI.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: deployedUrl ?? localUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Optional: point at an already-installed Chromium instead of the one
        // downloaded by `npx playwright install`. Not needed in normal use.
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  // Only start a local server when we are NOT testing a deployed URL.
  // `vite preview` serves the already-built dist/ folder (run `npm run build` first).
  webServer: deployedUrl
    ? undefined
    : {
        command: 'npm run preview -- --port 4173 --strictPort',
        url: localUrl,
        reuseExistingServer: !process.env.CI,
      },
});

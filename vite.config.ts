/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  // IMPORTANT for "build once, deploy everywhere":
  // A relative base ('./') makes every asset URL in dist/index.html relative.
  // That lets the exact same dist/ folder work at BOTH
  //   https://<user>.github.io/cicd-demo-dev/   (Development)
  //   https://<user>.github.io/cicd-demo/       (Production)
  // without rebuilding for each environment.
  base: './',

  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // Playwright tests live in tests/e2e and are run by Playwright, not Vitest.
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/setupTests.ts', 'src/vite-env.d.ts'],
      reporter: ['text', 'html', 'json-summary'],
      // The CI pipeline fails if ANY of these drop below 100%.
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});

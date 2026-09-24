import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // Generated folders are never linted.
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended, // core JavaScript mistakes (unused vars, unreachable code, ...)
      tseslint.configs.recommended, // TypeScript-specific mistakes
      reactHooks.configs.flat.recommended, // React Hooks rules (e.g. hooks inside if-statements)
      reactRefresh.configs.vite, // keeps Vite hot-reload working
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
    },
  },
  // Must come LAST: turns off any ESLint rules that would fight with Prettier.
  // ESLint = code quality, Prettier = formatting.
  eslintConfigPrettier,
]);

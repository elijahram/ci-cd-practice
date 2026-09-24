import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

// A SMALL, non-destructive smoke test. Tagged @smoke so the Production
// stage can run only this file with `npm run test:e2e:smoke`.
// (Todos live only in browser memory, so adding one affects no real users.)
test('@smoke app loads and a user can add one todo', async ({ page }) => {
  await openApp(page);
  await page.getByPlaceholder('What needs to be done?').fill('Smoke test todo');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Smoke test todo')).toBeVisible();
  await expect(page.getByTestId('remaining')).toHaveText('1 todo remaining');
});

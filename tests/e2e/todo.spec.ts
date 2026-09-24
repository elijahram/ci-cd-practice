import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

// Full user journey. Runs:
//   - in the Pull Request pipeline (against a local `vite preview` of dist/)
//   - after deploying to Development (against the real Development URL)
test('user can add, complete and delete a todo', async ({ page }) => {
  // 1. Open the application
  await openApp(page);
  await expect(page.getByTestId('remaining')).toHaveText('0 todos remaining');

  // 2. Add a todo
  await page.getByPlaceholder('What needs to be done?').fill('Watch the pipeline run');
  await page.getByRole('button', { name: 'Add' }).click();

  // 3. Verify it appears
  const todo = page.getByRole('listitem').filter({ hasText: 'Watch the pipeline run' });
  await expect(todo).toBeVisible();
  await expect(page.getByTestId('remaining')).toHaveText('1 todo remaining');

  // 4. Mark it complete
  await todo.getByRole('checkbox').check();
  await expect(todo.getByRole('checkbox')).toBeChecked();
  await expect(page.getByTestId('remaining')).toHaveText('0 todos remaining');

  // 5. Delete it
  await page.getByRole('button', { name: 'Delete Watch the pipeline run' }).click();

  // 6. Verify it disappears
  await expect(todo).toHaveCount(0);
});

test('pressing Enter also adds a todo', async ({ page }) => {
  await openApp(page);
  const input = page.getByPlaceholder('What needs to be done?');
  await input.fill('Added with the keyboard');
  await input.press('Enter');
  await expect(page.getByText('Added with the keyboard')).toBeVisible();
  await expect(input).toHaveValue('');
});

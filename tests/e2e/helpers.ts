import { expect, type Page } from '@playwright/test';

/**
 * Open the app.
 *
 * When EXPECTED_SHA is set (the pipeline sets it when testing a deployed
 * environment) we:
 *   1. add ?release=<sha> to bypass GitHub Pages' CDN cache, and
 *   2. assert the page is showing THAT build, so we never accidentally
 *      test an older version that happens to still be cached.
 *
 * When EXPECTED_ENVIRONMENT is set ("Development" or "Production") we also
 * check the environment badge, proving we are looking at the right site.
 */
export async function openApp(page: Page) {
  const expectedSha = process.env.EXPECTED_SHA;
  await page.goto(expectedSha ? `./?release=${expectedSha}` : './');
  await expect(page.getByRole('heading', { name: 'CI/CD Todo Demo' })).toBeVisible();

  if (expectedSha) {
    await expect(page.getByTestId('build-sha')).toHaveText(expectedSha.slice(0, 7));
  }

  const expectedEnvironment = process.env.EXPECTED_ENVIRONMENT;
  if (expectedEnvironment) {
    await expect(page.getByTestId('environment')).toHaveText(expectedEnvironment);
  }
}

import { expect, test } from '@playwright/test';

test('home page renders demo heading', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Next\.js \+ Rust \(WASM\) Template/i })
  ).toBeVisible();
});

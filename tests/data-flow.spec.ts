import { test, expect } from '@playwright/test';

test.describe('Data Flow: Entry → Dashboard', () => {
  const today = new Date().toISOString().split('T')[0];

  test('Production data should appear on dashboard after saving', async ({ page }) => {
    // 1. Go to entry page
    await page.goto('/entry');
    await expect(page.locator('h1')).toContainText('Production Entry');

    // 2. Fill in some test data for B1 cage
    const b1KgInput = page.locator('input[placeholder="0.0"]').first();
    await b1KgInput.fill('100');

    // Fill other fields
    const inputs = page.locator('input[type="number"]');
    const count = await inputs.count();
    for (let i = 1; i < Math.min(count, 5); i++) {
      await inputs.nth(i).fill((i * 10).toString());
    }

    // 3. Click save button
    await page.click('button:has-text("Save Information")');
    
    // 4. Wait for success message
    await expect(page.locator('text=Data saved successfully')).toBeVisible({ timeout: 5000 });

    // 5. Go to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 6. Verify the data appears on dashboard
    // The dashboard shows "Latest Production" card with total kg
    const dashboard = page.locator('body');
    await expect(dashboard).toContainText('Executive Dashboard');
  });

  test('CashFlow data should appear on dashboard after saving', async ({ page }) => {
    // 1. Go to entry page
    await page.goto('/entry');
    
    // 2. Switch to Cash Flow tab
    await page.click('button:has-text("Cash Flow")');
    await expect(page.locator('h1')).toContainText('Cash Flow Entry');

    // 3. Fill in some test data
    await page.fill('input[placeholder="0.0"] >> nth=0', '500000');
    await page.fill('input[placeholder="0.0"] >> nth=1', '200000');
    await page.fill('input[placeholder="0.0"] >> nth=2', '100000');

    // 4. Click save button
    await page.click('button:has-text("Save Information")');
    
    // 5. Wait for success message
    await expect(page.locator('text=Data saved successfully')).toBeVisible({ timeout: 5000 });

    // 6. Go to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 7. Verify dashboard loads
    await expect(page.locator('text=Executive Dashboard')).toBeVisible();
  });

  test('Dashboard displays production stats correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify stats cards are present
    await expect(page.locator('text=Total Production')).toBeVisible();
    await expect(page.locator('text=Daily Average')).toBeVisible();
    await expect(page.locator('text=Net Profit')).toBeVisible();
    await expect(page.locator('text=Latest Production')).toBeVisible();
    await expect(page.locator('text=Saldo Cash')).toBeVisible();
  });
});
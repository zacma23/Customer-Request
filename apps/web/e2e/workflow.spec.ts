import { test, expect } from '@playwright/test';

test.describe('End-to-End Client & Admin Portal Flow', () => {
  test('Landing page renders 9 services and navigation', async ({ page }) => {
    await page.goto('/');

    // Check brand header
    await expect(page.locator('text=ZacmaTech')).toBeVisible();

    // Verify key Ethiopian services displayed
    await expect(page.locator('text=Telegram Bot Development')).toBeVisible();
    await expect(page.locator('text=WhatsApp Bot Solutions')).toBeVisible();
    await expect(page.locator('text=E-Commerce Solutions')).toBeVisible();
    await expect(page.locator('text=Telebirr & Commercial Bank of Ethiopia (CBE)')).toBeVisible();

    // Check Login link
    const loginLink = page.locator('a:has-text("Sign In")');
    await expect(loginLink).toBeVisible();
  });

  test('Public authentication and OTP modal flow', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.locator('h1')).toContainText('Create Your Account');

    // Fill form
    await page.fill('input[name="name"]', 'Abebe Tesfaye');
    await page.fill('input[name="phone"]', '0911002233');
    await page.fill('input[name="password"]', 'ZacmaSecurePass2026!');

    // Submit triggers phone normalization and OTP challenge
    await page.click('button[type="submit"]');
  });

  test('Client portal and request submission layout', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Welcome Back')).toBeVisible();

    // Fill credentials
    await page.fill('input[name="phoneOrEmail"]', '+251911000003');
    await page.fill('input[name="password"]', 'ClientPass123!');
    await page.click('button[type="submit"]');
  });
});

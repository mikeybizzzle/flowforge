import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('should display login form', async ({ page }) => {
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.fill('input[type="email"]', 'invalid@email.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('.text-destructive, [role="alert"]')).toBeVisible({ timeout: 5000 });
    });

    test('should have link to signup page', async ({ page }) => {
      const signupLink = page.getByRole('link', { name: /sign up/i });
      await expect(signupLink).toBeVisible();
      await signupLink.click();
      await expect(page).toHaveURL('/signup');
    });

    test('should show validation error for empty email', async ({ page }) => {
      await page.fill('input[type="password"]', 'somepassword');
      await page.click('button[type="submit"]');

      // HTML5 validation or custom validation should prevent submission
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeFocused();
    });
  });

  test.describe('Signup Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup');
    });

    test('should display signup form', async ({ page }) => {
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should have link to login page', async ({ page }) => {
      const loginLink = page.getByRole('link', { name: /sign in|log in/i });
      await expect(loginLink).toBeVisible();
      await loginLink.click();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing projects without auth', async ({ page }) => {
      await page.goto('/projects');
      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should redirect to login when accessing project editor without auth', async ({ page }) => {
      await page.goto('/project/some-project-id');
      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

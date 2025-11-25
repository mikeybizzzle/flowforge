import { test as base, Page, expect } from '@playwright/test';

// Test user credentials - should match a user in test database
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@flowforge.dev',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

type AuthFixtures = {
  authenticatedPage: Page;
  testUser: typeof TEST_USER;
};

/**
 * Extended test fixture that provides an authenticated page.
 * Use this when testing features that require a logged-in user.
 *
 * @example
 * import { test, expect } from '../fixtures/auth.fixture';
 *
 * test('can view projects', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/projects');
 *   await expect(authenticatedPage.locator('h1')).toContainText('Projects');
 * });
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/login');

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to projects page
    await page.waitForURL('/projects', { timeout: 10000 });

    // Use the authenticated page in the test
    await use(page);
  },

  testUser: TEST_USER,
});

export { expect };

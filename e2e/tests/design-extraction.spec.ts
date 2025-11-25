import { test, expect, Page } from '@playwright/test';

/**
 * Design Extraction E2E Tests
 * Tests the design inspiration node functionality including:
 * - Pattern extraction from URLs
 * - Error handling for invalid inputs
 * - Applying extracted design to project
 */

// Mock API responses
const mockExtraction = {
  extraction: {
    color_palette: ['#3B82F6', '#6B7280', '#F59E0B', '#FFFFFF', '#111827'],
    typography: {
      detected: ['Inter', 'Roboto'],
      suggestions: ['Inter', 'System UI'],
    },
    layout_patterns: ['Hero with CTA', 'Feature Grid', 'Testimonial Carousel'],
    style_mood: 'Modern, clean, professional',
    components: ['Navigation', 'Hero Section', 'Feature Cards', 'Footer'],
  },
  usage: { input_tokens: 1000, output_tokens: 500 },
};

const mockErrorResponse = {
  error: 'Failed to extract design patterns',
};

/**
 * Setup API route mocking for design extraction tests
 */
async function setupDesignExtractMock(page: Page, response: object, status = 200) {
  await page.route('**/api/design-extract', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Setup delayed API response to test loading states
 */
async function setupDelayedDesignExtractMock(page: Page, response: object, delayMs = 2000) {
  await page.route('**/api/design-extract', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

test.describe('Design Extraction', () => {
  // Skip auth for these tests - we'll test the UI components in isolation
  // In a real scenario, you'd use the auth fixture

  test.describe('Design Node UI', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the auth check to allow access
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-id',
            email: 'test@example.com',
          }),
        });
      });

      // Mock project data with a design node
      await page.route('**/rest/v1/projects*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'test-project-id',
              name: 'Test Project',
              settings: {},
              user_id: 'test-user-id',
            }]),
          });
        } else {
          await route.continue();
        }
      });

      // Mock nodes endpoint
      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'design-node-1',
              project_id: 'test-project-id',
              type: 'design',
              position: { x: 100, y: 100 },
              data: {
                status: 'pending',
                source: '',
              },
            }]),
          });
        } else {
          await route.continue();
        }
      });

      // Mock edges endpoint
      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });
    });

    test('should display design node with extract button', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      // Look for the design node
      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Check for the extract button
      const extractButton = designNode.getByRole('button', { name: /extract/i });
      await expect(extractButton).toBeVisible();
    });

    test('should show settings button on design node', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Look for settings button (has Settings icon)
      const settingsButton = designNode.locator('button').filter({ has: page.locator('.lucide-settings') });
      await expect(settingsButton).toBeVisible();
    });
  });

  test.describe('Extraction Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Setup comprehensive mocking for extraction tests
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-id',
            email: 'test@example.com',
          }),
        });
      });

      await page.route('**/rest/v1/projects*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'test-project-id',
              name: 'Test Project',
              settings: {
                color_palette: {
                  primary: '#000000',
                  secondary: '#666666',
                  accent: '#FF0000',
                  background: '#FFFFFF',
                  text: '#000000',
                },
              },
              user_id: 'test-user-id',
            }]),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });
    });

    test('should show error toast when extracting without URL', async ({ page }) => {
      // Setup node without source URL
      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'design-node-1',
              project_id: 'test-project-id',
              type: 'design',
              position: { x: 100, y: 100 },
              data: {
                status: 'pending',
                source: '', // No URL
              },
            }]),
          });
        } else {
          await route.continue();
        }
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Click extract button
      const extractButton = designNode.getByRole('button', { name: /extract/i });
      await extractButton.click();

      // Should show error toast
      const toast = page.locator('[data-sonner-toast]');
      await expect(toast).toContainText(/please add a url/i, { timeout: 5000 });
    });

    test('should show loading state during extraction', async ({ page }) => {
      // Setup node with source URL
      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'design-node-1',
              project_id: 'test-project-id',
              type: 'design',
              position: { x: 100, y: 100 },
              data: {
                status: 'pending',
                source: 'https://example.com',
              },
            }]),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });

      // Setup delayed API response
      await setupDelayedDesignExtractMock(page, mockExtraction, 3000);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Click extract button
      const extractButton = designNode.getByRole('button', { name: /extract/i });
      await extractButton.click();

      // Should show loading toast
      const loadingToast = page.locator('[data-sonner-toast]');
      await expect(loadingToast).toContainText(/extracting/i, { timeout: 2000 });

      // Button should be disabled and show loading
      await expect(designNode.locator('button:has-text("Extracting")')).toBeVisible();
    });

    test('should display extracted colors after successful extraction', async ({ page }) => {
      // Setup node with source URL
      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'design-node-1',
              project_id: 'test-project-id',
              type: 'design',
              position: { x: 100, y: 100 },
              data: {
                status: 'pending',
                source: 'https://example.com',
              },
            }]),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });

      // Setup successful extraction response
      await setupDesignExtractMock(page, mockExtraction);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Click extract button
      const extractButton = designNode.getByRole('button', { name: /extract/i });
      await extractButton.click();

      // Wait for success toast
      const successToast = page.locator('[data-sonner-toast]');
      await expect(successToast).toContainText(/extracted/i, { timeout: 10000 });
    });

    test('should handle extraction API errors gracefully', async ({ page }) => {
      // Setup node with source URL
      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'design-node-1',
              project_id: 'test-project-id',
              type: 'design',
              position: { x: 100, y: 100 },
              data: {
                status: 'pending',
                source: 'https://example.com',
              },
            }]),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });

      // Setup error response
      await setupDesignExtractMock(page, mockErrorResponse, 500);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Click extract button
      const extractButton = designNode.getByRole('button', { name: /extract/i });
      await extractButton.click();

      // Should show error toast
      const errorToast = page.locator('[data-sonner-toast]');
      await expect(errorToast).toContainText(/failed/i, { timeout: 5000 });
    });
  });

  test.describe('Apply to Project', () => {
    test('should show Apply to Project button after successful extraction', async ({ page }) => {
      // Setup auth
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com' }),
        });
      });

      // Setup project with settings
      await page.route('**/rest/v1/projects*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'test-project-id',
              name: 'Test Project',
              settings: {},
              user_id: 'test-user-id',
            }]),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      // Setup node with completed extraction
      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'design-node-1',
              project_id: 'test-project-id',
              type: 'design',
              position: { x: 100, y: 100 },
              data: {
                status: 'complete',
                source: 'https://example.com',
                extraction: mockExtraction.extraction,
              },
            }]),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Should show Apply to Project button instead of Extract
      const applyButton = designNode.getByRole('button', { name: /apply to project/i });
      await expect(applyButton).toBeVisible();
    });

    test('should display extracted color swatches', async ({ page }) => {
      // Setup auth
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com' }),
        });
      });

      await page.route('**/rest/v1/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'test-project-id',
            name: 'Test Project',
            settings: {},
            user_id: 'test-user-id',
          }]),
        });
      });

      // Setup node with completed extraction including colors
      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'design-node-1',
              project_id: 'test-project-id',
              type: 'design',
              position: { x: 100, y: 100 },
              data: {
                status: 'complete',
                source: 'https://example.com',
                extraction: mockExtraction.extraction,
              },
            }]),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Should display color swatches (rounded divs with background colors)
      const colorSwatches = designNode.locator('div.rounded-full');
      await expect(colorSwatches).toHaveCount(5); // 5 colors in mock
    });

    test('should display style mood badge', async ({ page }) => {
      // Setup auth
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com' }),
        });
      });

      await page.route('**/rest/v1/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'test-project-id',
            name: 'Test Project',
            settings: {},
            user_id: 'test-user-id',
          }]),
        });
      });

      // Setup node with completed extraction
      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'design-node-1',
              project_id: 'test-project-id',
              type: 'design',
              position: { x: 100, y: 100 },
              data: {
                status: 'complete',
                source: 'https://example.com',
                extraction: mockExtraction.extraction,
              },
            }]),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Should display style mood
      await expect(designNode).toContainText(/modern.*clean.*professional/i);
    });
  });

  test.describe('Node Status Display', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com' }),
        });
      });

      await page.route('**/rest/v1/projects*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'test-project-id',
            name: 'Test Project',
            settings: {},
            user_id: 'test-user-id',
          }]),
        });
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });
    });

    test('should display pending status badge', async ({ page }) => {
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'design-node-1',
            project_id: 'test-project-id',
            type: 'design',
            position: { x: 100, y: 100 },
            data: { status: 'pending', source: '' },
          }]),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });
      await expect(designNode).toContainText(/pending/i);
    });

    test('should display complete status badge with checkmark', async ({ page }) => {
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'design-node-1',
            project_id: 'test-project-id',
            type: 'design',
            position: { x: 100, y: 100 },
            data: {
              status: 'complete',
              source: 'https://example.com',
              extraction: mockExtraction.extraction,
            },
          }]),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });
      await expect(designNode).toContainText(/complete/i);

      // Should have check icon
      const checkIcon = designNode.locator('.lucide-check');
      await expect(checkIcon).toBeVisible();
    });

    test('should display error status and allow retry', async ({ page }) => {
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'design-node-1',
            project_id: 'test-project-id',
            type: 'design',
            position: { x: 100, y: 100 },
            data: { status: 'error', source: 'https://example.com' },
          }]),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: 'Design' });
      await expect(designNode).toBeVisible({ timeout: 10000 });
      await expect(designNode).toContainText(/error/i);

      // Should show Extract button to allow retry
      const extractButton = designNode.getByRole('button', { name: /extract/i });
      await expect(extractButton).toBeVisible();
    });
  });
});

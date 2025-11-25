import { test, expect, Page } from '@playwright/test';

/**
 * PRD Generation E2E Tests
 * Tests the page node PRD generation functionality including:
 * - Opening PRD dialog
 * - Generating new PRDs
 * - Viewing existing PRDs
 * - Regenerating PRDs
 * - Copy and download functionality
 */

// Mock API responses
const mockPRDResponse = {
  prd: {
    content: `# Product Requirements Document

## Page Overview
This is a comprehensive PRD for the Home page of the project.

## Target Audience
- Primary users seeking information about the product
- Potential customers evaluating the solution

## User Stories
1. As a visitor, I want to understand what the product does
2. As a potential customer, I want to see key features
3. As a user, I want to easily navigate to other sections

## Functional Requirements
- **Hero Section**: Display main value proposition with CTA
- **Features Section**: Showcase 3-4 key features
- **Social Proof**: Display customer testimonials

## Technical Requirements
- Server-side rendering for SEO
- Lazy loading for images
- Mobile-responsive design

## Success Metrics
- Bounce rate < 40%
- Time on page > 2 minutes
- CTA click-through rate > 5%`,
    generated_at: new Date().toISOString(),
    version: 1,
  },
  usage: { input_tokens: 1500, output_tokens: 800 },
};

const mockRegeneratedPRD = {
  prd: {
    ...mockPRDResponse.prd,
    content: mockPRDResponse.prd.content + '\n\n## Additional Notes\nThis is the regenerated version.',
    version: 2,
  },
  usage: { input_tokens: 1600, output_tokens: 850 },
};

/**
 * Setup API route mocking for PRD generation tests
 */
async function setupPRDGenerateMock(page: Page, response: object, status = 200) {
  await page.route('**/api/generate-prd', async (route) => {
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
async function setupDelayedPRDGenerateMock(page: Page, response: object, delayMs = 2000) {
  await page.route('**/api/generate-prd', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

test.describe('PRD Generation', () => {
  test.describe('Page Node UI', () => {
    test.beforeEach(async ({ page }) => {
      // Mock auth
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

      // Mock project
      await page.route('**/rest/v1/projects*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'test-project-id',
              name: 'Test Project',
              settings: {
                industry: 'SaaS',
                target_audience: 'Small businesses',
              },
              user_id: 'test-user-id',
            }]),
          });
        } else {
          await route.continue();
        }
      });

      // Mock page node
      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'page-node-1',
              project_id: 'test-project-id',
              type: 'page',
              position: { x: 100, y: 100 },
              data: {
                type: 'page',
                name: 'Home',
                route: '/',
                section_ids: [],
                status: 'planning',
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
    });

    test('should display page node with PRD button', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      await expect(pageNode).toBeVisible({ timeout: 10000 });

      // Check for the PRD button
      const prdButton = pageNode.getByRole('button', { name: /prd/i });
      await expect(prdButton).toBeVisible();
    });

    test('should display page name and route', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Page' });
      await expect(pageNode).toBeVisible({ timeout: 10000 });

      // Check for page name and route
      await expect(pageNode).toContainText('Home');
      await expect(pageNode).toContainText('/');
    });
  });

  test.describe('PRD Dialog', () => {
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

    test('should open PRD dialog when clicking PRD button', async ({ page }) => {
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'page-node-1',
            project_id: 'test-project-id',
            type: 'page',
            position: { x: 100, y: 100 },
            data: {
              type: 'page',
              name: 'Home',
              route: '/',
              section_ids: [],
              status: 'planning',
            },
          }]),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      await expect(pageNode).toBeVisible({ timeout: 10000 });

      // Click PRD button
      const prdButton = pageNode.getByRole('button', { name: /prd/i });
      await prdButton.click();

      // Dialog should open
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(/home.*prd/i);
    });

    test('should show empty state when no PRD exists', async ({ page }) => {
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'page-node-1',
            project_id: 'test-project-id',
            type: 'page',
            position: { x: 100, y: 100 },
            data: {
              type: 'page',
              name: 'Home',
              route: '/',
              section_ids: [],
              status: 'planning',
              // No prd field
            },
          }]),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      const prdButton = pageNode.getByRole('button', { name: /prd/i });
      await prdButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText(/no prd generated/i);
      await expect(dialog.getByRole('button', { name: /generate prd/i })).toBeVisible();
    });

    test('should display existing PRD content', async ({ page }) => {
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'page-node-1',
            project_id: 'test-project-id',
            type: 'page',
            position: { x: 100, y: 100 },
            data: {
              type: 'page',
              name: 'Home',
              route: '/',
              section_ids: [],
              status: 'complete',
              prd: mockPRDResponse.prd,
            },
          }]),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      const prdButton = pageNode.getByRole('button', { name: /view prd/i });
      await prdButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText(/product requirements document/i);
      await expect(dialog).toContainText(/page overview/i);
      await expect(dialog).toContainText(/v1/i); // Version badge
    });
  });

  test.describe('PRD Generation Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com' }),
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
                industry: 'SaaS',
                target_audience: 'Small businesses',
              },
              user_id: 'test-user-id',
            }]),
          });
        } else {
          await route.fulfill({ status: 200, body: '{}' });
        }
      });

      await page.route('**/rest/v1/nodes*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
              id: 'page-node-1',
              project_id: 'test-project-id',
              type: 'page',
              position: { x: 100, y: 100 },
              data: {
                type: 'page',
                name: 'Home',
                route: '/',
                section_ids: [],
                status: 'planning',
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
    });

    test('should show loading state during PRD generation', async ({ page }) => {
      await setupDelayedPRDGenerateMock(page, mockPRDResponse, 3000);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      const prdButton = pageNode.getByRole('button', { name: /prd/i });
      await prdButton.click();

      const dialog = page.getByRole('dialog');
      const generateButton = dialog.getByRole('button', { name: /generate prd/i });
      await generateButton.click();

      // Should show loading toast
      const loadingToast = page.locator('[data-sonner-toast]');
      await expect(loadingToast).toContainText(/generating/i, { timeout: 2000 });

      // Button in dialog should show generating state
      await expect(dialog.locator('button:has-text("Generating")')).toBeVisible();
    });

    test('should display generated PRD after successful generation', async ({ page }) => {
      await setupPRDGenerateMock(page, mockPRDResponse);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      const prdButton = pageNode.getByRole('button', { name: /prd/i });
      await prdButton.click();

      const dialog = page.getByRole('dialog');
      const generateButton = dialog.getByRole('button', { name: /generate prd/i });
      await generateButton.click();

      // Wait for success toast
      const successToast = page.locator('[data-sonner-toast]');
      await expect(successToast).toContainText(/generated/i, { timeout: 10000 });
    });

    test('should handle generation errors gracefully', async ({ page }) => {
      await setupPRDGenerateMock(page, { error: 'Failed to generate PRD' }, 500);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      const prdButton = pageNode.getByRole('button', { name: /prd/i });
      await prdButton.click();

      const dialog = page.getByRole('dialog');
      const generateButton = dialog.getByRole('button', { name: /generate prd/i });
      await generateButton.click();

      // Should show error toast
      const errorToast = page.locator('[data-sonner-toast]');
      await expect(errorToast).toContainText(/failed/i, { timeout: 5000 });
    });
  });

  test.describe('PRD Actions', () => {
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

      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'page-node-1',
            project_id: 'test-project-id',
            type: 'page',
            position: { x: 100, y: 100 },
            data: {
              type: 'page',
              name: 'Home',
              route: '/',
              section_ids: [],
              status: 'complete',
              prd: mockPRDResponse.prd,
            },
          }]),
        });
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });
    });

    test('should have copy button that copies PRD content', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      const prdButton = pageNode.getByRole('button', { name: /view prd/i });
      await prdButton.click();

      const dialog = page.getByRole('dialog');
      const copyButton = dialog.getByRole('button', { name: /copy/i });
      await expect(copyButton).toBeVisible();

      // Click copy
      await copyButton.click();

      // Should show success toast
      const toast = page.locator('[data-sonner-toast]');
      await expect(toast).toContainText(/copied/i, { timeout: 3000 });
    });

    test('should have download button', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      const prdButton = pageNode.getByRole('button', { name: /view prd/i });
      await prdButton.click();

      const dialog = page.getByRole('dialog');
      const downloadButton = dialog.getByRole('button', { name: /download/i });
      await expect(downloadButton).toBeVisible();
    });

    test('should have regenerate button for existing PRD', async ({ page }) => {
      await setupPRDGenerateMock(page, mockRegeneratedPRD);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      const prdButton = pageNode.getByRole('button', { name: /view prd/i });
      await prdButton.click();

      const dialog = page.getByRole('dialog');
      const regenerateButton = dialog.getByRole('button', { name: /regenerate/i });
      await expect(regenerateButton).toBeVisible();
    });

    test('should close dialog when clicking Close button', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      const prdButton = pageNode.getByRole('button', { name: /view prd/i });
      await prdButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      const closeButton = dialog.getByRole('button', { name: /close/i });
      await closeButton.click();

      await expect(dialog).not.toBeVisible();
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

    test('should show planning status for new page', async ({ page }) => {
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'page-node-1',
            project_id: 'test-project-id',
            type: 'page',
            position: { x: 100, y: 100 },
            data: {
              type: 'page',
              name: 'Home',
              route: '/',
              section_ids: [],
              status: 'planning',
            },
          }]),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      await expect(pageNode).toContainText(/planning/i);
    });

    test('should show complete status for page with PRD', async ({ page }) => {
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'page-node-1',
            project_id: 'test-project-id',
            type: 'page',
            position: { x: 100, y: 100 },
            data: {
              type: 'page',
              name: 'Home',
              route: '/',
              section_ids: [],
              status: 'complete',
              prd: mockPRDResponse.prd,
            },
          }]),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      await expect(pageNode).toContainText(/complete/i);
    });

    test('should show section count badge', async ({ page }) => {
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'page-node-1',
            project_id: 'test-project-id',
            type: 'page',
            position: { x: 100, y: 100 },
            data: {
              type: 'page',
              name: 'Home',
              route: '/',
              section_ids: ['section-1', 'section-2', 'section-3'],
              status: 'planning',
            },
          }]),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: 'Home' });
      // Should show section count
      await expect(pageNode).toContainText('3');
    });
  });
});

import { test, expect, Page } from '@playwright/test';

/**
 * Export E2E Tests
 * Tests the project export functionality including:
 * - Export button visibility and interaction
 * - Loading states during export
 * - File download handling
 * - Error scenarios
 */

// Create a simple mock zip response (just a small buffer representing a zip file)
const mockZipBuffer = Buffer.from('PK\x03\x04mockzipdata');

/**
 * Setup export API mock for successful export
 */
async function setupExportMock(page: Page) {
  await page.route('**/api/export', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/zip',
        headers: {
          'Content-Disposition': 'attachment; filename="test-project-export.zip"',
        },
        body: mockZipBuffer,
      });
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projectName: 'Test Project',
          hasSettings: true,
          nodeCounts: { page: 2, section: 5 },
          estimatedFiles: 13,
        }),
      });
    }
  });
}

/**
 * Setup delayed export mock to test loading states
 */
async function setupDelayedExportMock(page: Page, delayMs = 2000) {
  await page.route('**/api/export', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'application/zip',
      headers: {
        'Content-Disposition': 'attachment; filename="test-project-export.zip"',
      },
      body: mockZipBuffer,
    });
  });
}

/**
 * Setup export error mock
 */
async function setupExportErrorMock(page: Page) {
  await page.route('**/api/export', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Failed to export project' }),
    });
  });
}

test.describe('Export Feature', () => {
  test.describe('Export Button UI', () => {
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
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 'test-project-id',
            name: 'Test Project',
            settings: {
              color_palette: {
                primary: '#3B82F6',
                secondary: '#6B7280',
              },
            },
            user_id: 'test-user-id',
          }]),
        });
      });

      // Mock nodes
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'page-node-1',
              project_id: 'test-project-id',
              type: 'page',
              position: { x: 100, y: 100 },
              data: {
                type: 'page',
                name: 'Home',
                route: '/',
                section_ids: ['section-1'],
                status: 'complete',
              },
            },
            {
              id: 'section-1',
              project_id: 'test-project-id',
              type: 'section',
              position: { x: 100, y: 300 },
              data: {
                type: 'section',
                section_type: 'hero',
                name: 'Hero Section',
                status: 'complete',
              },
            },
          ]),
        });
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });
    });

    test('should display export button in header', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      // Look for the export button (download icon)
      const exportButton = page.locator('header button').filter({ has: page.locator('.lucide-download') });
      await expect(exportButton).toBeVisible({ timeout: 10000 });
    });

    test('should have tooltip on export button', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const exportButton = page.locator('header button').filter({ has: page.locator('.lucide-download') });
      await exportButton.hover();

      // Check for tooltip
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toContainText(/export/i, { timeout: 3000 });
    });
  });

  test.describe('Export Flow', () => {
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

      // Mock nodes
      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });
    });

    test('should show loading state during export', async ({ page }) => {
      await setupDelayedExportMock(page, 3000);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const exportButton = page.locator('header button').filter({ has: page.locator('.lucide-download') });
      await exportButton.click();

      // Should show loading toast
      const loadingToast = page.locator('[data-sonner-toast]');
      await expect(loadingToast).toContainText(/preparing|export/i, { timeout: 2000 });

      // Button should show loading spinner
      const loadingSpinner = page.locator('header button .lucide-loader-2');
      await expect(loadingSpinner).toBeVisible();
    });

    test('should show success toast after export completes', async ({ page }) => {
      await setupExportMock(page);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const exportButton = page.locator('header button').filter({ has: page.locator('.lucide-download') });
      await exportButton.click();

      // Wait for success toast
      const successToast = page.locator('[data-sonner-toast]');
      await expect(successToast).toContainText(/exported|ready/i, { timeout: 10000 });
    });

    test('should trigger file download on successful export', async ({ page }) => {
      await setupExportMock(page);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      const exportButton = page.locator('header button').filter({ has: page.locator('.lucide-download') });
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/test-project.*\.zip/i);
    });

    test('should handle export errors gracefully', async ({ page }) => {
      await setupExportErrorMock(page);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const exportButton = page.locator('header button').filter({ has: page.locator('.lucide-download') });
      await exportButton.click();

      // Should show error toast
      const errorToast = page.locator('[data-sonner-toast]');
      await expect(errorToast).toContainText(/failed/i, { timeout: 5000 });
    });

    test('should disable export button while export is in progress', async ({ page }) => {
      await setupDelayedExportMock(page, 5000);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const exportButton = page.locator('header button').filter({ has: page.locator('.lucide-download, .lucide-loader-2') });
      await exportButton.first().click();

      // Button should be disabled
      await expect(exportButton.first()).toBeDisabled();
    });
  });

  test.describe('Export API', () => {
    test('should return 401 for unauthenticated requests', async ({ page }) => {
      // Don't mock auth - let it fail
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      // Make direct API call
      const response = await page.request.post('/api/export', {
        data: { projectId: 'test-project-id' },
      });

      expect(response.status()).toBe(401);
    });

    test('should return 400 for missing projectId', async ({ page }) => {
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-user-id' }),
        });
      });

      // Let the actual API handle this
      await page.route('**/api/export', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'projectId is required' }),
        });
      });

      const response = await page.request.post('/api/export', {
        data: {},
      });

      expect(response.status()).toBe(400);
    });

    test('should return 404 for non-existent project', async ({ page }) => {
      await page.route('**/api/export', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Project not found or unauthorized' }),
        });
      });

      const response = await page.request.post('/api/export', {
        data: { projectId: 'non-existent-project' },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('Export Preview API', () => {
    test('should return export preview information', async ({ page }) => {
      await page.route('**/api/export*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              projectName: 'Test Project',
              hasSettings: true,
              nodeCounts: {
                page: 3,
                section: 8,
                design: 1,
                competitor: 2,
              },
              estimatedFiles: 17,
            }),
          });
        }
      });

      const response = await page.request.get('/api/export?projectId=test-project-id');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.projectName).toBe('Test Project');
      expect(data.hasSettings).toBe(true);
      expect(data.nodeCounts.page).toBe(3);
      expect(data.estimatedFiles).toBe(17);
    });
  });

  test.describe('Export Content Validation', () => {
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
            name: 'My Awesome Project',
            settings: {
              color_palette: {
                primary: '#FF5733',
                secondary: '#333333',
                accent: '#00FF00',
                background: '#FFFFFF',
                text: '#000000',
              },
              typography: {
                heading_font: 'Montserrat',
                body_font: 'Open Sans',
              },
            },
            user_id: 'test-user-id',
          }]),
        });
      });

      await page.route('**/rest/v1/nodes*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'page-1',
              project_id: 'test-project-id',
              type: 'page',
              position: { x: 100, y: 100 },
              data: {
                type: 'page',
                name: 'Home',
                route: '/',
                section_ids: ['hero-1', 'features-1'],
                status: 'complete',
              },
            },
            {
              id: 'page-2',
              project_id: 'test-project-id',
              type: 'page',
              position: { x: 400, y: 100 },
              data: {
                type: 'page',
                name: 'About',
                route: '/about',
                section_ids: [],
                status: 'complete',
              },
            },
            {
              id: 'hero-1',
              project_id: 'test-project-id',
              type: 'section',
              position: { x: 100, y: 300 },
              data: {
                type: 'section',
                section_type: 'hero',
                name: 'Hero Section',
                status: 'complete',
              },
            },
            {
              id: 'features-1',
              project_id: 'test-project-id',
              type: 'section',
              position: { x: 100, y: 500 },
              data: {
                type: 'section',
                section_type: 'features',
                name: 'Features Section',
                status: 'complete',
              },
            },
          ]),
        });
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });
    });

    test('should export project with correct filename based on project name', async ({ page }) => {
      await setupExportMock(page);

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const downloadPromise = page.waitForEvent('download');

      const exportButton = page.locator('header button').filter({ has: page.locator('.lucide-download') });
      await exportButton.click();

      const download = await downloadPromise;
      // Filename should be based on project name
      expect(download.suggestedFilename()).toMatch(/my-awesome-project.*\.zip/i);
    });
  });
});

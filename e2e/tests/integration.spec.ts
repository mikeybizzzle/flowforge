import { test, expect, Page } from '@playwright/test';

/**
 * Integration E2E Tests
 * Tests complete user workflows that span multiple features:
 * - Full project lifecycle
 * - Canvas interactions
 * - Node workflows (create, configure, generate)
 * - Cross-feature interactions
 */

// Mock responses for integration tests
const mockDesignExtraction = {
  extraction: {
    color_palette: ['#3B82F6', '#6B7280', '#F59E0B', '#FFFFFF', '#111827'],
    typography: { detected: ['Inter', 'Roboto'], suggestions: ['Inter', 'System UI'] },
    layout_patterns: ['Hero with CTA', 'Feature Grid'],
    style_mood: 'Modern, clean, professional',
    components: ['Navigation', 'Hero Section', 'Footer'],
  },
  usage: { input_tokens: 1000, output_tokens: 500 },
};

const mockPRD = {
  prd: {
    content: '# Product Requirements Document\n\n## Overview\nHome page PRD...',
    generated_at: new Date().toISOString(),
    version: 1,
  },
  usage: { input_tokens: 1500, output_tokens: 800 },
};

const mockCompetitorAnalysis = {
  analysis: {
    strengths: ['Strong branding', 'Clear CTAs'],
    weaknesses: ['Slow load time'],
    design_patterns: ['Hero with video', 'Testimonial carousel'],
    messaging_style: 'Professional and authoritative',
    unique_features: ['AI-powered recommendations'],
    ctas: ['Start Free Trial', 'Book a Demo'],
  },
  usage: { input_tokens: 1200, output_tokens: 600 },
};

/**
 * Setup all API mocks for integration tests
 */
async function setupIntegrationMocks(page: Page) {
  // Auth
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com' }),
    });
  });

  // Projects
  await page.route('**/rest/v1/projects*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-project-id',
          name: 'Integration Test Project',
          settings: {
            industry: 'SaaS',
            target_audience: 'Small businesses',
            color_palette: {
              primary: '#3B82F6',
              secondary: '#6B7280',
              accent: '#F59E0B',
              background: '#FFFFFF',
              text: '#111827',
            },
          },
          user_id: 'test-user-id',
        }]),
      });
    } else {
      await route.fulfill({ status: 200, body: '{}' });
    }
  });

  // Nodes
  await page.route('**/rest/v1/nodes*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'project-node-1',
            project_id: 'test-project-id',
            type: 'project',
            position: { x: 250, y: 50 },
            data: {
              type: 'project',
              name: 'Integration Test Project',
              industry: 'SaaS',
              target_audience: 'Small businesses',
            },
          },
          {
            id: 'design-node-1',
            project_id: 'test-project-id',
            type: 'design',
            position: { x: 100, y: 200 },
            data: {
              type: 'design',
              status: 'pending',
              source: 'https://stripe.com',
              source_type: 'url',
            },
          },
          {
            id: 'competitor-node-1',
            project_id: 'test-project-id',
            type: 'competitor',
            position: { x: 400, y: 200 },
            data: {
              type: 'competitor',
              url: 'https://example-competitor.com',
              name: 'Example Competitor',
              status: 'pending',
            },
          },
          {
            id: 'page-node-1',
            project_id: 'test-project-id',
            type: 'page',
            position: { x: 250, y: 400 },
            data: {
              type: 'page',
              name: 'Home',
              route: '/',
              section_ids: ['section-node-1'],
              status: 'planning',
            },
          },
          {
            id: 'section-node-1',
            project_id: 'test-project-id',
            type: 'section',
            position: { x: 250, y: 600 },
            data: {
              type: 'section',
              section_type: 'hero',
              name: 'Hero Section',
              status: 'draft',
            },
          },
        ]),
      });
    } else {
      await route.fulfill({ status: 200, body: '{}' });
    }
  });

  // Edges
  await page.route('**/rest/v1/edges*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'edge-1', source_id: 'project-node-1', target_id: 'design-node-1' },
        { id: 'edge-2', source_id: 'project-node-1', target_id: 'competitor-node-1' },
        { id: 'edge-3', source_id: 'design-node-1', target_id: 'page-node-1' },
        { id: 'edge-4', source_id: 'page-node-1', target_id: 'section-node-1' },
      ]),
    });
  });

  // Design extract API
  await page.route('**/api/design-extract', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDesignExtraction),
    });
  });

  // PRD generation API
  await page.route('**/api/generate-prd', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPRD),
    });
  });

  // Competitor analysis API
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockCompetitorAnalysis),
    });
  });

  // Export API
  await page.route('**/api/export', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/zip',
      headers: { 'Content-Disposition': 'attachment; filename="project-export.zip"' },
      body: Buffer.from('PK\x03\x04mockzipdata'),
    });
  });

  // Generations
  await page.route('**/rest/v1/generations*', async (route) => {
    await route.fulfill({ status: 200, body: '[]' });
  });
}

test.describe('Integration Tests', () => {
  test.describe('Project Canvas Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await setupIntegrationMocks(page);
    });

    test('should load project editor with canvas and all nodes', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      // Verify canvas is loaded
      const canvas = page.locator('.react-flow');
      await expect(canvas).toBeVisible({ timeout: 10000 });

      // Verify all node types are visible
      await expect(page.locator('.react-flow__node').filter({ hasText: /project/i })).toBeVisible();
      await expect(page.locator('.react-flow__node').filter({ hasText: /design/i })).toBeVisible();
      await expect(page.locator('.react-flow__node').filter({ hasText: /competitor/i })).toBeVisible();
      await expect(page.locator('.react-flow__node').filter({ hasText: /home/i })).toBeVisible();
      await expect(page.locator('.react-flow__node').filter({ hasText: /hero/i })).toBeVisible();
    });

    test('should display project name in header', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const header = page.locator('header');
      await expect(header).toContainText('Integration Test Project');
    });

    test('should allow switching between canvas and preview views', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      // Start on canvas view
      const canvas = page.locator('.react-flow');
      await expect(canvas).toBeVisible({ timeout: 10000 });

      // Switch to preview
      const previewButton = page.getByRole('button', { name: /live preview/i });
      await previewButton.click();

      // Canvas might still be visible but preview should be active
      await expect(previewButton).toHaveClass(/bg-background/);

      // Switch back to canvas
      const canvasButton = page.getByRole('button', { name: /strategy canvas/i });
      await canvasButton.click();

      await expect(canvasButton).toHaveClass(/bg-background/);
    });
  });

  test.describe('Design to PRD Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await setupIntegrationMocks(page);
    });

    test('should complete design extraction and view colors', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: /design/i });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Click extract button
      const extractButton = designNode.getByRole('button', { name: /extract/i });
      await extractButton.click();

      // Wait for success
      const toast = page.locator('[data-sonner-toast]');
      await expect(toast).toContainText(/extracted/i, { timeout: 10000 });
    });

    test('should open PRD dialog and generate PRD', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const pageNode = page.locator('.react-flow__node').filter({ hasText: /home/i }).first();
      await expect(pageNode).toBeVisible({ timeout: 10000 });

      // Click PRD button
      const prdButton = pageNode.getByRole('button', { name: /prd/i });
      await prdButton.click();

      // Dialog should open
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Generate PRD
      const generateButton = dialog.getByRole('button', { name: /generate/i });
      await generateButton.click();

      // Wait for success
      const toast = page.locator('[data-sonner-toast]');
      await expect(toast).toContainText(/generated/i, { timeout: 10000 });
    });
  });

  test.describe('Full Export Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await setupIntegrationMocks(page);
    });

    test('should export project after design and PRD steps', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

      // Click export button
      const exportButton = page.locator('header button').filter({ has: page.locator('.lucide-download') });
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.zip');

      // Success toast should appear
      const toast = page.locator('[data-sonner-toast]');
      await expect(toast).toContainText(/exported|ready/i);
    });
  });

  test.describe('Node Selection and Configuration', () => {
    test.beforeEach(async ({ page }) => {
      await setupIntegrationMocks(page);
    });

    test('should select node when clicked', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: /design/i });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Click to select
      await designNode.click();

      // Node should have selected styling (ring)
      await expect(designNode).toHaveClass(/ring/);
    });

    test('should open settings dialog when clicking settings button', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: /design/i });
      await expect(designNode).toBeVisible({ timeout: 10000 });

      // Click settings button
      const settingsButton = designNode.locator('button').filter({ has: page.locator('.lucide-settings') });
      await settingsButton.click();

      // Config dialog should open
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Project Settings Integration', () => {
    test.beforeEach(async ({ page }) => {
      await setupIntegrationMocks(page);
    });

    test('should open project settings from header', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      // Click settings button in header
      const settingsButton = page.locator('header button').filter({ has: page.locator('.lucide-settings') });
      await settingsButton.click();

      // Settings dialog should open
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(/project settings/i);
    });

    test('should display current project settings in dialog', async ({ page }) => {
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      // Open settings
      const settingsButton = page.locator('header button').filter({ has: page.locator('.lucide-settings') });
      await settingsButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Should show project industry
      await expect(dialog).toContainText(/saas/i);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Setup with error responses
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
            id: 'design-node-1',
            project_id: 'test-project-id',
            type: 'design',
            position: { x: 100, y: 100 },
            data: {
              type: 'design',
              status: 'pending',
              source: 'https://example.com',
              source_type: 'url',
            },
          }]),
        });
      });

      await page.route('**/rest/v1/edges*', async (route) => {
        await route.fulfill({ status: 200, body: '[]' });
      });

      // Make design extract fail
      await page.route('**/api/design-extract', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const designNode = page.locator('.react-flow__node').filter({ hasText: /design/i });
      const extractButton = designNode.getByRole('button', { name: /extract/i });
      await extractButton.click();

      // Should show error toast
      const toast = page.locator('[data-sonner-toast]');
      await expect(toast).toContainText(/failed|error/i, { timeout: 5000 });
    });

    test('should redirect to login when unauthenticated', async ({ page }) => {
      // Don't mock auth - return 401
      await page.route('**/auth/v1/user', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      await page.goto('/project/test-project-id');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should handle different viewport sizes', async ({ page }) => {
      await setupIntegrationMocks(page);

      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/project/test-project-id');
      await page.waitForLoadState('networkidle');

      const canvas = page.locator('.react-flow');
      await expect(canvas).toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(canvas).toBeVisible();

      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      // Canvas should still be visible (might need scroll)
      await expect(canvas).toBeVisible();
    });
  });
});

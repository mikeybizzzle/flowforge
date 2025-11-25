import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Project Editor page
 * Encapsulates all selectors and common operations for the main editor interface
 */
export class ProjectEditorPage {
  readonly page: Page;

  // Header elements
  readonly backButton: Locator;
  readonly projectName: Locator;
  readonly canvasViewButton: Locator;
  readonly previewViewButton: Locator;
  readonly settingsButton: Locator;
  readonly exportButton: Locator;
  readonly deployButton: Locator;

  // Canvas elements
  readonly canvas: Locator;
  readonly addNodeButton: Locator;
  readonly minimap: Locator;
  readonly controls: Locator;

  // Chat panel elements
  readonly chatPanel: Locator;
  readonly chatInput: Locator;
  readonly chatSendButton: Locator;
  readonly chatMessages: Locator;

  // Preview panel elements
  readonly previewPanel: Locator;
  readonly previewFrame: Locator;
  readonly codeEditor: Locator;
  readonly viewportSwitcher: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.backButton = page.locator('a[href="/projects"]').first();
    this.projectName = page.locator('header').getByRole('heading').first();
    this.canvasViewButton = page.getByRole('button', { name: /strategy canvas/i });
    this.previewViewButton = page.getByRole('button', { name: /live preview/i });
    this.settingsButton = page.locator('button').filter({ has: page.locator('.lucide-settings') });
    this.exportButton = page.locator('button').filter({ has: page.locator('.lucide-download') });
    this.deployButton = page.getByRole('button', { name: /deploy/i });

    // Canvas
    this.canvas = page.locator('.react-flow');
    this.addNodeButton = page.getByRole('button', { name: /add/i }).first();
    this.minimap = page.locator('.react-flow__minimap');
    this.controls = page.locator('.react-flow__controls');

    // Chat Panel
    this.chatPanel = page.locator('[class*="chat"]').first();
    this.chatInput = page.locator('textarea[placeholder*="Describe"]');
    this.chatSendButton = page.locator('button').filter({ has: page.locator('.lucide-send') });
    this.chatMessages = page.locator('[class*="message"]');

    // Preview Panel
    this.previewPanel = page.locator('[class*="preview"]').first();
    this.previewFrame = page.locator('iframe');
    this.codeEditor = page.locator('.sp-code-editor');
    this.viewportSwitcher = page.locator('[class*="viewport"]');
  }

  /**
   * Navigate to a specific project
   */
  async navigate(projectId: string): Promise<void> {
    await this.page.goto(`/project/${projectId}`);
    await this.waitForPageLoad();
  }

  /**
   * Wait for the editor to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(this.canvas).toBeVisible({ timeout: 10000 });
  }

  /**
   * Switch to Preview view
   */
  async switchToPreview(): Promise<void> {
    await this.previewViewButton.click();
    await expect(this.previewPanel).toBeVisible();
  }

  /**
   * Switch to Canvas view
   */
  async switchToCanvas(): Promise<void> {
    await this.canvasViewButton.click();
    await expect(this.canvas).toBeVisible();
  }

  /**
   * Add a new node of the specified type
   */
  async addNode(type: 'competitor' | 'design' | 'page' | 'section'): Promise<void> {
    await this.addNodeButton.click();
    await this.page.getByRole('menuitem', { name: new RegExp(type, 'i') }).click();
  }

  /**
   * Send a message in the chat panel
   */
  async sendChatMessage(message: string): Promise<void> {
    await this.chatInput.fill(message);
    await this.chatSendButton.click();
  }

  /**
   * Click the export button
   */
  async clickExport(): Promise<void> {
    await this.exportButton.click();
  }

  /**
   * Open project settings dialog
   */
  async openSettings(): Promise<void> {
    await this.settingsButton.click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  /**
   * Get a node by its displayed text/name
   */
  getNodeByName(name: string): Locator {
    return this.page.locator('.react-flow__node').filter({ hasText: name });
  }

  /**
   * Get a node by type
   */
  getNodeByType(type: string): Locator {
    return this.page.locator(`[data-nodetype="${type}"]`);
  }

  /**
   * Click on a specific node
   */
  async selectNode(name: string): Promise<void> {
    const node = this.getNodeByName(name);
    await node.click();
    await expect(node).toHaveClass(/selected/);
  }

  /**
   * Double-click a node to open config dialog
   */
  async openNodeConfig(name: string): Promise<void> {
    const node = this.getNodeByName(name);
    await node.dblclick();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  /**
   * Click "Build" button on a section node
   */
  async buildSection(sectionName: string): Promise<void> {
    const node = this.getNodeByName(sectionName);
    const buildButton = node.getByRole('button', { name: /build/i });
    await buildButton.click();
  }

  /**
   * Click "Analyze" button on a competitor node
   */
  async analyzeCompetitor(competitorName: string): Promise<void> {
    const node = this.getNodeByName(competitorName);
    const analyzeButton = node.getByRole('button', { name: /analyze/i });
    await analyzeButton.click();
  }

  /**
   * Click "Extract Patterns" button on a design node
   */
  async extractDesignPatterns(designName: string): Promise<void> {
    const node = this.getNodeByName(designName);
    const extractButton = node.getByRole('button', { name: /extract/i });
    await extractButton.click();
  }

  /**
   * Click "PRD" button on a page node
   */
  async openPagePRD(pageName: string): Promise<void> {
    const node = this.getNodeByName(pageName);
    const prdButton = node.getByRole('button', { name: /prd/i });
    await prdButton.click();
  }

  /**
   * Verify a toast notification appears with specific text
   */
  async expectToast(text: string | RegExp): Promise<void> {
    const toast = this.page.locator('[data-sonner-toast]');
    await expect(toast).toContainText(text);
  }

  /**
   * Wait for a toast to disappear
   */
  async waitForToastToDismiss(): Promise<void> {
    await this.page.locator('[data-sonner-toast]').waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Drag a node to a new position
   */
  async dragNode(name: string, deltaX: number, deltaY: number): Promise<void> {
    const node = this.getNodeByName(name);
    const box = await node.boundingBox();
    if (!box) throw new Error(`Node ${name} not found`);

    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + box.width / 2 + deltaX, box.y + box.height / 2 + deltaY);
    await this.page.mouse.up();
  }

  /**
   * Connect two nodes by dragging from source handle to target
   */
  async connectNodes(sourceName: string, targetName: string): Promise<void> {
    const sourceNode = this.getNodeByName(sourceName);
    const targetNode = this.getNodeByName(targetName);

    const sourceHandle = sourceNode.locator('.react-flow__handle-bottom');
    const targetHandle = targetNode.locator('.react-flow__handle-top');

    await sourceHandle.dragTo(targetHandle);
  }
}

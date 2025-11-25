import { Page } from '@playwright/test';

/**
 * Mock API responses for testing
 */
export const mockResponses = {
  generateSection: {
    code: `export default function HeroSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          Welcome to Our Platform
        </h1>
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Build amazing websites with AI-powered tools
        </p>
        <button className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition">
          Get Started
        </button>
      </div>
    </section>
  );
}`,
    version: 1,
    generationId: 'gen_mock_123',
    usage: { input_tokens: 500, output_tokens: 1000 },
  },

  analyzeCompetitor: {
    analysis: {
      strengths: ['Strong branding', 'Clear value proposition', 'Modern design'],
      weaknesses: ['Slow load time', 'Complex navigation'],
      design_patterns: ['Hero with video background', 'Feature grid', 'Social proof section'],
      messaging_style: 'Professional, technical, and approachable',
      unique_features: ['Interactive product demo', 'AI-powered recommendations'],
      ctas: ['Start Free Trial', 'Schedule Demo', 'Learn More'],
    },
    usage: { input_tokens: 800, output_tokens: 600 },
  },

  designExtract: {
    extraction: {
      color_palette: ['#1E40AF', '#3B82F6', '#F59E0B', '#FFFFFF', '#1F2937'],
      typography: {
        detected: ['Inter', 'Roboto'],
        suggestions: ['SF Pro', 'Open Sans'],
      },
      layout_patterns: ['Hero with CTA', 'Feature Grid', 'Testimonial Carousel'],
      style_mood: 'Modern, Professional, Clean',
      components: ['Navigation Bar', 'Hero Section', 'Feature Cards', 'Footer'],
    },
    usage: { input_tokens: 600, output_tokens: 400 },
  },

  generatePrd: {
    prd: `# Product Requirements Document

## 1. Overview
This page serves as the main landing page for the platform.

### Purpose
- Introduce the product to new visitors
- Convert visitors into trial users
- Showcase key features and benefits

### Target Audience
- Small business owners
- Startup founders
- Marketing professionals

## 2. User Stories
- As a visitor, I want to understand the product value quickly
- As a potential customer, I want to see pricing options
- As a user, I want to start a free trial easily

## 3. Functional Requirements

### Hero Section
- Compelling headline and subheadline
- Primary CTA button (Start Free Trial)
- Secondary CTA (Learn More)

### Features Section
- Grid of 4-6 key features
- Icon + Title + Description for each
- Hover effects for engagement

## 4. Success Criteria
- Page load time < 3 seconds
- Mobile responsive at all breakpoints
- WCAG 2.1 AA compliance`,
    version: 1,
    generationId: 'prd_mock_456',
    usage: { input_tokens: 1200, output_tokens: 2000 },
  },

  chatResponse: {
    message: "I'd be happy to help you build that section. Based on your project context, I recommend starting with a hero section that highlights your main value proposition. Would you like me to generate the code for that?",
    usage: { input_tokens: 300, output_tokens: 150 },
  },
};

/**
 * Set up API mocks for all endpoints
 * Call this in beforeEach to mock API responses
 */
export async function setupAPIMocks(page: Page): Promise<void> {
  // Mock code generation
  await page.route('**/api/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponses.generateSection),
    });
  });

  // Mock competitor analysis
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponses.analyzeCompetitor),
    });
  });

  // Mock design extraction
  await page.route('**/api/design-extract', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponses.designExtract),
    });
  });

  // Mock PRD generation
  await page.route('**/api/generate-prd', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponses.generatePrd),
    });
  });

  // Mock chat
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponses.chatResponse),
    });
  });

  // Mock export - return a mock zip file
  await page.route('**/api/export', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/zip',
      headers: {
        'Content-Disposition': 'attachment; filename="test-project-export.zip"',
      },
      body: Buffer.from('PK mock zip content'),
    });
  });
}

/**
 * Set up error mocks for testing error handling
 */
export async function setupErrorMocks(page: Page, endpoint: string, error: { status: number; message: string }): Promise<void> {
  await page.route(`**/api/${endpoint}`, async (route) => {
    await route.fulfill({
      status: error.status,
      contentType: 'application/json',
      body: JSON.stringify({ error: error.message }),
    });
  });
}

/**
 * Set up delayed mock for testing loading states
 */
export async function setupDelayedMock(page: Page, endpoint: string, delayMs: number, response: object): Promise<void> {
  await page.route(`**/api/${endpoint}`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

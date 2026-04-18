// Quantyval AI - Browser Automation
// Playwright-based browser control

import { logger } from '../utils/logger.js';

export class Browser {
  constructor(options = {}) {
    this.headless = options.headless ?? true;
    this.viewport = options.viewport || { width: 1280, height: 720 };
    this.browser = null;
    this.context = null;
    this.page = null;
    this.playwright = null;
  }
  
  // Initialize browser
  async init() {
    try {
      // Dynamic import for optional dependency
      this.playwright = await import('playwright');
      
      this.browser = await this.playwright.chromium.launch({
        headless: this.headless,
      });
      
      this.context = await this.browser.newContext({
        viewport: this.viewport,
      });
      
      this.page = await this.context.newPage();
      logger.info('Browser initialized');
    } catch (e) {
      throw new Error('Playwright not installed. Run: npm install playwright');
    }
  }
  
  // Navigate to URL
  async goto(url, options = {}) {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page.goto(url, { waitUntil: 'domcontentloaded', ...options });
  }
  
  // Click element
  async click(selector) {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.click(selector);
  }
  
  // Type text
  async type(selector, text, options = {}) {
    if (!this.page) throw new Error('Browser not initialized');
    await this.page.fill(selector, text);
  }
  
  // Get text content
  async text(selector) {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page.textContent(selector);
  }
  
  // Get HTML
  async html(selector) {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page.innerHTML(selector);
  }
  
  // Evaluate JS
  async evaluate(fn) {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page.evaluate(fn);
  }
  
  // Wait for selector
  async wait(selector, options = {}) {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page.waitForSelector(selector, options);
  }
  
  // Take screenshot
  async screenshot(options = {}) {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page.screenshot(options);
  }
  
  // Get page title
  async title() {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page.title();
  }
  
  // Close browser
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      logger.info('Browser closed');
    }
  }
}

// Helper functions for common tasks
export const browserHelpers = {
  // Fill form
  async fillForm(page, fields) {
    for (const [selector, value] of Object.entries(fields)) {
      await page.fill(selector, value);
    }
  },
  
  // Click and wait for navigation
  async clickAndWait(page, selector) {
    await Promise.all([
      page.waitForNavigation(),
      page.click(selector),
    ]);
  },
  
  // Wait for network idle
  async waitIdle(page, timeout = 3000) {
    await page.waitForLoadState('networkidle', { timeout });
  },
  
  // Extract links
  async extractLinks(page) {
    return page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.textContent, href: a.href }));
    });
  },
  
  // Extract forms
  async extractForms(page) {
    return page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input')).map(i => ({
          name: i.name,
          type: i.type,
        })),
      }));
    });
  },
};

// Create browser instance
export function createBrowser(options = {}) {
  return new Browser(options);
}
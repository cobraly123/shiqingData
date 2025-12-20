import { browserManager } from '../core/BrowserManager.js';

export class ModelTestExecutor {
  constructor(config = {}) {
    this.config = config;
    this.context = null;
    this.page = null;
  }

  async setup() {
    this.context = await browserManager.newContext();
    this.page = await this.context.newPage();
  }

  async runTest(url, actions) {
    if (!this.page) {
      await this.setup();
    }

    const results = {
      logs: [],
      screenshots: [],
      data: {}
    };

    try {
      console.log(`Navigating to ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle' });

      for (const action of actions) {
        if (action.type === 'wait') {
          await this.page.waitForTimeout(action.duration);
        } else if (action.type === 'click') {
          await this.page.click(action.selector);
        } else if (action.type === 'input') {
          await this.page.fill(action.selector, action.value);
        } else if (action.type === 'screenshot') {
           // Handled by ScreenshotService typically, but here for basic flow
           const buffer = await this.page.screenshot({ fullPage: action.fullPage });
           results.screenshots.push({ name: action.name, buffer });
        }
      }
      
      results.status = 'success';
    } catch (error) {
      console.error('Test execution failed:', error);
      results.status = 'failed';
      results.error = error.message;
    } finally {
      await this.teardown();
    }

    return results;
  }

  async teardown() {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }
}

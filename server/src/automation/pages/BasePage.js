import { config } from '../config/config.js';

export class BasePage {
  constructor(page, modelKey) {
    this.page = page;
    this.modelConfig = config.models[modelKey];
    if (!this.modelConfig) {
      throw new Error(`Configuration for model '${modelKey}' not found.`);
    }
  }

  async navigate() {
    console.log(`Navigating to ${this.modelConfig.name} at ${this.modelConfig.url}`);
    await this.page.goto(this.modelConfig.url, { waitUntil: 'networkidle' });
  }

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    // Wait for input to be visible
    await this.page.waitForSelector(selectors.input, { state: 'visible' });
    
    // Type query
    await this.page.fill(selectors.input, query);
    
    // Click submit or press Enter
    const submitBtn = await this.page.$(selectors.submit);
    if (submitBtn && await submitBtn.isVisible()) {
        console.log('Submit button found, clicking...');
        await submitBtn.click();
    } else {
        console.log('Submit button not found or not visible, pressing Enter...');
        await this.page.press(selectors.input, 'Enter');
    }
  }

  async waitForResponse(timeout = 30000) {
    const selectors = this.modelConfig.selectors;
    
    // Wait for response container
    // Note: This logic might need refinement per model (e.g., waiting for streaming to stop)
    // A common pattern is to wait for the response selector to appear and stabilize
    await this.page.waitForSelector(selectors.response, { timeout });
    
    // Simple stabilization wait (can be improved with MutationObserver logic)
    await this.page.waitForTimeout(2000); 
    
    return await this.extractResponse();
  }

  async extractResponse() {
    const selectors = this.modelConfig.selectors;
    try {
        // Get all response elements and pick the last one usually
        const responses = await this.page.$$(selectors.response);
        if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            return await lastResponse.textContent();
        }
        return null;
    } catch (e) {
        console.error('Failed to extract response:', e);
        return null;
    }
  }
}

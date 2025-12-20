import { BasePage } from './BasePage.js';

export class YuanbaoPage extends BasePage {
  constructor(page, modelConfig) {
    super(page, modelConfig);
  }

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    // Wait for input to be ready
    await this.page.waitForSelector(selectors.input, { state: 'visible', timeout: 15000 });
    
    // Focus and Type
    const input = await this.page.$(selectors.input);
    await input.click();
    await this.page.waitForTimeout(500); // Wait for focus
    
    // Clear existing content (if any)
    await this.page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) el.innerHTML = ''; 
    }, selectors.input);
    
    await this.page.keyboard.type(query, { delay: 10 }); 
    await this.page.waitForTimeout(1000);

    // Try pressing Enter first
    console.log('Pressing Enter to submit...');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);

    // Backup: Click submit if button exists and looks active
    const submitBtn = await this.page.$(selectors.submit);
    if (submitBtn && await submitBtn.isVisible()) {
        console.log('Clicking submit button as backup...');
        try {
            await submitBtn.click({ force: true });
        } catch (e) {
            console.log('Click failed:', e.message);
        }
    }

    // Wait for response generation to start
    console.log('Waiting for response...');
  }

  async waitForResponse(timeout = 30000) {
    // Override base method to use a broader selector check and stabilization
    const selectors = [
        '.answer-content', 
        '.markdown-body', 
        'div[class*="message"]', 
        'div[class*="content"]',
        '.agent-message-content' // Potential class for Yuanbao
    ];
    
    const combinedSelector = selectors.join(', ');
    console.log(`Waiting for any of: ${combinedSelector}`);

    try {
        await this.page.waitForSelector(combinedSelector, { state: 'visible', timeout: timeout });
        
        // Wait for generation to complete (stabilization)
        await this.waitForGenerationToComplete(combinedSelector);

        // Get the text of the LAST match
        const elements = await this.page.$$(combinedSelector);
        if (elements.length > 0) {
            const lastElement = elements[elements.length - 1];
            return await lastElement.innerText();
        }
        return '';
    } catch (e) {
        console.error(`Wait for response failed: ${e.message}`);
        throw e;
    }
  }

  async waitForGenerationToComplete(selector) {
    console.log('Waiting for generation to complete...');
    // Simple stabilization wait: wait for text content to stop changing
    let lastText = '';
    let retries = 0;
    const maxRetries = 30; // 30 * 1000ms = 30s max wait
    
    while (retries < maxRetries) {
        await this.page.waitForTimeout(1000);
        const elements = await this.page.$$(selector);
        if (elements.length === 0) continue;
        
        const lastElement = elements[elements.length - 1];
        const text = await lastElement.textContent();
        
        // Basic heuristic: text length > 0 and unchanged for 1 sec
        // Also check if "Thinking" or loading indicators are gone if possible
        if (text === lastText && text.length > 0) { 
            console.log('Generation complete (Content stable).');
            return;
        }
        lastText = text;
        retries++;
    }
    console.log('Generation wait timed out or stabilized.');
  }
}

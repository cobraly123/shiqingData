import { BasePage } from './BasePage.js';

export class WenxinPage extends BasePage {
  constructor(page) {
    super(page, 'wenxin');
  }

  async navigate() {
    await super.navigate();
  }

  async isLoggedIn() {
    // Strong check: Look for User Avatar or specific logged-in elements
    const userAvatar = await this.page.$('div[class*="avatar"], img[alt*="头像"], .user-center');
    return userAvatar && await userAvatar.isVisible();
  }

  async handleLogin() {
    // Setup Network Listener
    // Wenxin uses /api/user or similar
    const authCheckPromise = this.checkLoginByNetwork(/api\/(user|chat)/, 10000);

    const result = await super.handleLogin(false);

    // Check Network
    try {
        const isNetworkAuth = await Promise.race([
            authCheckPromise,
            new Promise(r => setTimeout(() => r(false), 1000))
        ]);
        if (isNetworkAuth) {
             console.log('Login confirmed via Network!');
             return true;
        }
    } catch (e) {}

    if (result) return true;

    return await this.waitForManualLogin();
  }

  async sendQuery(query) {
    console.log(`Sending query to Wenxin: ${query.substring(0, 50)}...`);
    const selectors = this.modelConfig.selectors;
    
    // Log current state
    console.log('Current URL:', this.page.url());
    
    // Ensure input is visible
    try {
        await this.page.waitForSelector(selectors.input, { state: 'visible', timeout: 10000 });
    } catch (e) {
        console.error('Input box not found. Check if logged in or selectors changed.');
        // Try to take a screenshot or dump html if possible (omitted for now)
        throw e;
    }

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

    // Try pressing Enter first, it's often more reliable
    console.log('Pressing Enter to submit...');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);

    // Check if response started (optional, or just rely on waitForResponse)
    // If we wanted to be sure, we could check if input is empty or loading indicator appears.
    
    /* 
    // Fallback to Click if needed (commented out to favor Enter for now, or use as backup)
     console.log('Clicking submit button...');
     const submitBtn = await this.page.$(selectors.submit);
     if (submitBtn) {
         await submitBtn.click();
     }
    */
     
     await this.page.waitForTimeout(3000);
     try {
        const bodyText = await this.page.innerText('body');
        // console.log('Page content after submit:', bodyText.substring(0, 200).replace(/\n/g, ' '));
     } catch (e) {
        console.log('Could not get page content:', e.message);
     }

     // Wait for response generation to start
     console.log('Waiting for response...');
   }

  async extractResponse() {
    const selectors = this.modelConfig.selectors;
    
    // Wait for the response to start generating
    await this.page.waitForSelector(selectors.response, { timeout: 10000 });
    
    // Smart Wait: Wait for generation to complete
    await this.waitForGenerationToComplete(selectors.response);

    // Get the last response bubble
    const responses = await this.page.$$(selectors.response);
    if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        
        // Extract Text
        const text = await lastResponse.textContent();
        
        // Return structured result similar to QwenPage
        return {
            text: text,
            rawHtml: await lastResponse.innerHTML()
        };
    }
    return null;
  }

  async waitForGenerationToComplete(responseSelector) {
    // Improved implementation:
    // 1. Wait for "Regenerate" button to appear (strong signal of completion)
    // 2. Fallback to stability check (content length/height not changing)
    // 3. Max timeout 120s
    
    console.log('Waiting for generation to complete...');
    const startTime = Date.now();
    const maxDuration = 120000; // 2 minutes
    const stabilityThreshold = 5000; // 5 seconds of no change
    
    let lastTextLength = 0;
    let lastChangeTime = Date.now();
    
    while (Date.now() - startTime < maxDuration) {
        // Check 1: Is "Regenerate" button visible?
        // Note: Selector might need adjustment based on exact UI
        const regenerateBtn = await this.page.$(this.modelConfig.selectors.regenerate || 'div[class*="regenerate"], div[class*="refresh"], span:has-text("重新生成")');
        if (regenerateBtn && await regenerateBtn.isVisible()) {
            console.log('Generation complete (Regenerate button detected).');
            return;
        }

        // Check 2: Content stability
        const responses = await this.page.$$(responseSelector);
        if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            const text = await lastResponse.textContent();
            const currentLength = text.length;
            
            if (currentLength !== lastTextLength) {
                lastTextLength = currentLength;
                lastChangeTime = Date.now();
            } else {
                // Content hasn't changed
                if (Date.now() - lastChangeTime > stabilityThreshold) {
                    console.log('Generation complete (Content stable).');
                    return;
                }
            }
        }
        
        await this.page.waitForTimeout(1000);
    }
    
    console.log('Warning: Timeout waiting for generation to complete.');
  }
}

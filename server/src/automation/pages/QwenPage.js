import { BasePage } from './BasePage.js';

export class QwenPage extends BasePage {
  constructor(page) {
    super(page, 'qwen');
  }

  async navigate() {
    await super.navigate();
  }

  async isLoggedIn() {
      // Strategy 1: Check for Login button (Fastest fail)
      const loginBtn = await this.page.$('text="登录"');
      if (loginBtn && await loginBtn.isVisible()) {
          console.log('Login button detected. Not logged in.');
          return false;
      }

      // Strategy 2: Network Check (Most Reliable)
      // Check for Qwen's user info or session API
      // Common Qwen APIs: /api/v1/user/info, /api/v1/chat/history, or similar
      // We perform a quick check if we can catch a relevant network request
      // NOTE: This is best used during page load. If page is static, we might miss it.
      // So we combine it with UI check.
      
      // Strategy 3: UI Check (Fallback)
      if (await this.page.isVisible(this.modelConfig.selectors.input)) {
          return true; 
      }
      
      return false;
  }

  async handleLogin() {
      // Special handling for Qwen's dual domain requirement
      if (await this.isLoggedIn()) {
          console.log('Already logged in.');
          return true;
      }

      if (this.modelConfig.auth && this.modelConfig.auth.cookies) {
          console.log('Injecting Qwen cookies (Dual Domain)...');
          // Inject for both domains
          await this.injectCookies(this.modelConfig.auth.cookies, '.aliyun.com');
          await this.injectCookies(this.modelConfig.auth.cookies, '.qianwen.com');
          
          console.log('Reloading page and listening for auth signals...');
          
          // Setup Network Listener BEFORE reload to catch the boot-up requests
          const authCheckPromise = this.checkLoginByNetwork('api/v1', 10000); // Generalized pattern for Qwen API
          
          await this.page.reload();
          
          // Wait for either Network Success OR UI Success
          try {
              // Race between network confirmation and UI timeout
              const isNetworkAuth = await authCheckPromise;
              if (isNetworkAuth) {
                  console.log('Login confirmed via Network!');
                  return true;
              }
          } catch (e) {
              console.log('Network auth check timed out, falling back to UI check.');
          }

          await this.checkAndClosePopups();
          
          if (await this.isLoggedIn()) {
              console.log('Auto-login successful (UI verified)!');
              return true;
          }
      }
      
      return super.handleLogin(); // Fallback to manual wait
  }

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    // Ensure we are on the chat interface
    await this.page.waitForSelector(selectors.input);
    
    // Type query with slight delay to mimic human behavior
    await this.page.fill(selectors.input, query);
    await this.page.waitForTimeout(500); 

    // Click submit or press Enter
    const submitBtn = await this.page.$(selectors.submit);
    if (submitBtn) {
        console.log('Submit button found, clicking...');
        await submitBtn.click();
    } else {
        console.log('Submit button not found, pressing Enter...');
        await this.page.press(selectors.input, 'Enter');
    }
    console.log('Query sent.');
  }

  async extractResponse() {
    const selectors = this.modelConfig.selectors;
    
    // Wait for the response to start generating
    await this.page.waitForSelector(selectors.response, { timeout: 10000 });
    
    // Smart Wait: Wait for "regenerate" button or "copy" button to appear, indicating generation is done
    // Or wait for text content to stop changing
    await this.waitForGenerationToComplete(selectors.response);

    // Get the last response bubble
    const responses = await this.page.$$(selectors.response);
    const lastResponse = responses[responses.length - 1];
    
    // Extract Text
    const text = await lastResponse.textContent();
    
    // Extract Sources (if any)
    const sources = await this.extractSources(lastResponse);

    return {
        text: text,
        sources: sources,
        rawHtml: await lastResponse.innerHTML()
    };
  }

  async extractSources(responseElement) {
    const sourceSelector = this.modelConfig.selectors.citation;
    const sources = [];
    
    try {
        const citationElements = await responseElement.$$(sourceSelector);
        for (const el of citationElements) {
            const title = await el.innerText();
            const url = await el.getAttribute('href'); // Assuming it's a link
            sources.push({ title, url });
        }
    } catch (e) {
        // Ignore extraction errors, sources might not exist
    }
    return sources;
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
          const regenerateBtn = await this.page.$(this.modelConfig.selectors.regenerate || 'div[class*="regenerate"]');
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
                  // console.log(`Generation in progress... Length: ${currentLength}`);
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

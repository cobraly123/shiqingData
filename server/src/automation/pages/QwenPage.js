import { BasePage } from './BasePage.js';

export class QwenPage extends BasePage {
  constructor(page) {
    super(page, 'qwen');
  }

  async navigate() {
    console.log(`Navigating to ${this.modelConfig.name} at ${this.modelConfig.url}`);
    try {
        // Use domcontentloaded and longer timeout to be more robust against network issues
        await this.page.goto(this.modelConfig.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
        console.log(`Navigation partial timeout or error: ${e.message}. Continuing...`);
    }
  }

  async handleLogin() {
    console.log('Checking login status for Qwen...');
    
    try {
      // Wait for UI to load (either input or login button)
      await this.page.waitForSelector('textarea, #chat-input, text="登录"', { timeout: 10000 });

      // Check for Login button first - if present, we are definitely NOT logged in
      const loginBtn = await this.page.$('text="登录"');
      if (loginBtn && await loginBtn.isVisible()) {
          console.log('Login button detected. Not logged in.');
          // Fall through to cookie injection
      } else {
          // If no login button, check for input
          if (await this.page.isVisible(this.modelConfig.selectors.input)) {
              console.log('Already logged in (No login button found and input is visible).');
              return true; 
          }
      }
    } catch (e) {
      console.log('Login required or input not found immediately.');
    }

    // Auto-login via Cookie Injection
    if (this.modelConfig.auth && this.modelConfig.auth.cookies) {
        console.log('Injecting Qwen cookies...');
        
        // Clear existing cookies to ensure a clean state
        await this.page.context().clearCookies();
        
        const rawCookies = this.modelConfig.auth.cookies;
        const cookieArray = rawCookies.split('; ').map(pair => {
            const index = pair.indexOf('=');
            if (index === -1) return null;
            const name = pair.substring(0, index).trim();
            const value = pair.substring(index + 1).trim();
            
            // Domain logic refinement
            // We need to inject into both .aliyun.com and .qianwen.com to be safe
            // But since map returns one object, we'll handle duplication later or just default to .aliyun.com
            // and let the browser handle subdomains if we are lucky.
            // Better approach: returning an array of cookies for this pair
            
            return [
                {
                    name: name,
                    value: value,
                    domain: '.aliyun.com', 
                    path: '/',
                    secure: true
                },
                {
                    name: name,
                    value: value,
                    domain: '.qianwen.com', 
                    path: '/',
                    secure: true
                }
            ];
        }).flat().filter(c => c !== null); // Use flat() to flatten the array of arrays

        await this.page.context().addCookies(cookieArray);
        
        console.log(`Injected ${cookieArray.length} cookies (dual-domain injection).`);
        console.log('Reloading page...');
        await this.page.reload();
        await this.page.waitForTimeout(5000); // Wait for reload to settle
        
        try {
            await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 15000, state: 'visible' });
            
            // Strict check: If login button is visible, it's a FAILURE.
            const loginBtnPost = await this.page.$('text="登录"');
            if (loginBtnPost && await loginBtnPost.isVisible()) {
                console.error('Login button is visible. Login FAILED.');
                await this.page.screenshot({ path: 'reports/screenshots/qwen_login_fail_strict.png' });
                throw new Error('Login button detected after cookie injection');
            } else {
                console.log('Auto-login successful! (No login button, input visible)');
                return true;
            }
        } catch (e) {
            console.error('Auto-login failed: ' + e.message);
            await this.page.screenshot({ path: 'reports/screenshots/qwen_login_fail_catch.png' });
        }
    }

    console.log('No credentials provided. Please login manually.');
    console.log('Waiting for user to complete login...');
    
    // Wait for input box to appear - this is the signal that login is complete and we are on the chat page
    // Increase timeout to 5 minutes to give user plenty of time
    try {
        await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 300000, state: 'visible' });
        console.log('Login detected! Chat input is visible.');
        
        // Debug: Print cookies after successful login
        const cookies = await this.page.context().cookies();
        console.log('--- Cookies after successful login ---');
        console.log(cookies.map(c => `${c.name}=${c.value} (Domain: ${c.domain})`).join('\n'));
        console.log('--------------------------------------');

        return true; // New login occurred
    } catch (e) {
        console.error('Timeout waiting for login to complete.');
        throw e;
    }
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

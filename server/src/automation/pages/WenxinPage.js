import { BasePage } from './BasePage.js';

export class WenxinPage extends BasePage {
  constructor(page) {
    super(page, 'wenxin');
  }

  async navigate() {
    console.log(`Navigating to ${this.modelConfig.name} at ${this.modelConfig.url}`);
    try {
        await this.page.goto(this.modelConfig.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.page.waitForTimeout(2000);
    } catch (e) {
        console.log(`Navigation partial timeout or error: ${e.message}. Continuing...`);
    }
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

  async handleLogin() {
    console.log('Checking login status for Wenxin...');
    
    // Always inject cookies first if available and we are in a fresh context
    // But since we can't easily know if it's fresh, let's look for a strong "Logged In" signal first.
    // The input box is NOT a strong signal for Wenxin.
    
    try {
      // Strong check: Look for User Avatar or specific logged-in elements
      // Not just input box.
      const userAvatar = await this.page.$('div[class*="avatar"], img[alt*="头像"], .user-center');
      if (userAvatar && await userAvatar.isVisible()) {
          console.log('User avatar found. Already logged in.');
          return true;
      } else {
          console.log('User avatar not found. Proceeding to cookie injection...');
      }
    } catch (e) {
      console.log('Error checking login status:', e);
    }

    // Auto-login via Cookie Injection
    if (this.modelConfig.auth && this.modelConfig.auth.cookies) {
        console.log('Injecting Wenxin cookies...');
        const rawCookies = this.modelConfig.auth.cookies;
        const cookieArray = rawCookies.split('; ').map(pair => {
            const index = pair.indexOf('=');
            if (index === -1) return null;
            const name = pair.substring(0, index).trim();
            const value = pair.substring(index + 1).trim();
            return {
                name: name,
                value: value,
                domain: '.baidu.com', // Assumption for Baidu/Wenxin
                path: '/',
                secure: true
            };
        }).filter(c => c !== null);

        // Hack: Ensure BDUSS is present if BDUSS_BFESS is there
        const bduss = cookieArray.find(c => c.name === 'BDUSS');
        const bdussBfess = cookieArray.find(c => c.name === 'BDUSS_BFESS');
        
        if (!bduss && bdussBfess) {
            console.log('Adding BDUSS from BDUSS_BFESS...');
            cookieArray.push({
                ...bdussBfess,
                name: 'BDUSS'
            });
        }

        await this.page.context().addCookies(cookieArray);
        
        console.log('Cookies injected. Reloading page...');
        await this.page.reload();
        
        try {
            await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 15000, state: 'visible' });
            console.log('Auto-login successful!');
            return true;
        } catch (e) {
            console.error('Auto-login failed after cookie injection.');
        }
    }

    const { username, password } = this.modelConfig.auth || {};
    
    // Auto-login logic would go here if we had specific selectors for Baidu login
    // For now, we fall back to manual login
    
    console.log('Please login manually to Wenxin (Ernie Bot).');
    console.log('Waiting for user to complete login...');
    
    try {
        // Wait up to 5 minutes for user to login and the chat input to appear
        await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 300000, state: 'visible' });
        console.log('Login detected! Chat input is visible.');
        return true;
    } catch (e) {
        console.error('Timeout waiting for login to complete.');
        throw e;
    }
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

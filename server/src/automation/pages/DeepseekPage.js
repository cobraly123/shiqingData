import { BasePage } from './BasePage.js';

export class DeepseekPage extends BasePage {
  constructor(page) {
    super(page, 'deepseek');
  }

  async handleLogin() {
    console.log('Checking login status for Deepseek...');
    
    try {
      await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 5000, state: 'visible' });
      console.log('Already logged in.');
      return true;
    } catch (e) {
      console.log('Login required.');
    }

    // Auto-login via Cookie Injection
    if (this.modelConfig.auth && (this.modelConfig.auth.cookies || this.modelConfig.auth.userToken)) {
        console.log('Injecting Deepseek auth data...');
        
        // Clear existing cookies to ensure a clean state
        await this.page.context().clearCookies();

        // 1. Inject Cookies if present
        if (this.modelConfig.auth.cookies) {
            const rawCookies = this.modelConfig.auth.cookies;
            const cookieArray = rawCookies.split('; ').map(pair => {
                const index = pair.indexOf('=');
                if (index === -1) return null;
                const name = pair.substring(0, index);
                const value = pair.substring(index + 1);
                return {
                    name: name.trim(),
                    value: value.trim(),
                    domain: '.deepseek.com',
                    path: '/',
                    secure: true
                };
            }).filter(c => c !== null);

            await this.page.context().addCookies(cookieArray);
            console.log(`Injected ${cookieArray.length} cookies for .deepseek.com`);
        }

        // 2. Inject LocalStorage (userToken) if present
        // We need to navigate to the domain first to set localStorage
        // But we want to avoid full load if possible, or just load, inject, reload
        console.log('Navigating to domain root to set LocalStorage...');
        await this.page.goto('https://chat.deepseek.com/sign_in', { waitUntil: 'domcontentloaded' });
        
        if (this.modelConfig.auth.userToken) {
            console.log('Injecting userToken into LocalStorage...');
            const tokenValue = this.modelConfig.auth.userToken;
            await this.page.evaluate((token) => {
                localStorage.setItem('userToken', token);
            }, tokenValue);
            console.log('LocalStorage injection complete.');
        }
        
        console.log('Reloading page to apply auth...');
        await this.page.reload();
        await this.page.waitForTimeout(5000); // Wait for reload
        
        console.log(`Current URL: ${this.page.url()}`);
        console.log(`Page Title: ${await this.page.title()}`);

        try {
            await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 15000, state: 'visible' });
            console.log('Auto-login successful!');
            return true;
        } catch (e) {
            console.error('Auto-login failed after auth injection.');
            await this.page.screenshot({ path: 'reports/screenshots/deepseek_login_fail.png' });
            const content = await this.page.content();
            console.log('Page content preview:', content.substring(0, 500));
        }
    }

    console.log('Please login manually to Deepseek.');
    console.log('Waiting for user to complete login...');
    
    try {
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

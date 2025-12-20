import { BasePage } from './BasePage.js';

export class DoubaoPage extends BasePage {
  constructor(page) {
    super(page, 'doubao');
  }

  async handleLogin() {
    console.log('Checking login status for Doubao...');
    
    try {
      // Check for Login button first - if present, we are definitely NOT logged in
      const loginBtn = await this.page.$('button[data-testid="login_button"], button:has-text("登录"), div[class*="login-btn"]');
      if (loginBtn && await loginBtn.isVisible()) {
          console.log('Login button detected. Not logged in.');
          throw new Error('Login required');
      }

      await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 5000, state: 'visible' });
      console.log('Already logged in.');
      return true;
    } catch (e) {
      console.log('Login required or input not found immediately.');
    }

    // Auto-login via Cookie Injection
    if (this.modelConfig.auth && this.modelConfig.auth.cookies) {
        console.log('Injecting Doubao cookies...');
        
        // Clear existing cookies to ensure a clean state
        await this.page.context().clearCookies();
        
        const rawCookies = this.modelConfig.auth.cookies;
        console.log(`Raw Cookie Length: ${rawCookies.length}`);

        const cookieArray = [];
        const pairs = rawCookies.split('; ');
        
        for (const pair of pairs) {
            const index = pair.indexOf('=');
            if (index === -1) continue;
            const name = pair.substring(0, index).trim();
            const value = pair.substring(index + 1).trim();
            
            // Push for root domain (most common)
             cookieArray.push({
                 name: name,
                 value: value,
                 domain: '.doubao.com',
                 path: '/',
                 secure: true,
                 httpOnly: false
             });
             // Also push for www domain to be safe
             cookieArray.push({
                 name: name,
                 value: value,
                 domain: 'www.doubao.com',
                 path: '/',
                 secure: true,
                 httpOnly: false
             });
         }
         
         console.log(`Parsed ${cookieArray.length} cookies (including duplicates for domains).`);
 
         if (cookieArray.length > 0) {
             await this.page.context().addCookies(cookieArray);
             
             // Verify injection
             const currentCookies = await this.page.context().cookies();
             console.log(`Cookies in browser after injection: ${currentCookies.length}`);
             
             console.log('Cookies injected. Reloading page...');
             await this.page.reload({ waitUntil: 'domcontentloaded' });
             await this.page.waitForTimeout(5000); // Wait for auth check to complete
             
             // Check for popups after reload
             await this.handlePopups();
 
             // Re-check login status
             const loginBtnAfter = await this.page.$('button[data-testid="login_button"], button:has-text("登录"), div[class*="login-btn"]');
             if (loginBtnAfter && await loginBtnAfter.isVisible()) {
                 console.error('Login button still visible after injection. Cookie might be invalid or expired.');
                 
                 // Fallback to manual login
                 console.log('Falling back to manual login wait...');
             } else {
                  console.log('Login button not found after injection. Assuming logged in.');
                  return true;
             }
         } else {
             console.error('No valid cookies parsed from config.');
         }

    } // End of cookie injection block

    console.log('Please login manually to Doubao.');
    console.log('Waiting for user to complete login...');
    
    // Wait for login to complete (Login button to disappear or Input to appear)
    try {
        await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 300000, state: 'visible' });
        console.log('Login detected! Chat input is visible.');
        
        // Capture new cookies for the user
        const newCookies = await this.page.context().cookies();
        const cookieString = newCookies.map(c => `${c.name}=${c.value}`).join('; ');
        console.log('\n--- CAPTURED NEW COOKIES (Please update your .env file) ---');
        console.log(`DOUBAO_COOKIES="${cookieString}"`);
        console.log('-----------------------------------------------------------\n');

        return true;
    } catch (e) {
        console.error('Timeout waiting for login to complete.');
        throw e;
    }
  }

  async handlePopups() {
    console.log('Checking for popups...');
    const closeSelectors = [
        'div[class*="close-btn"]', 
        'button[class*="close-btn"]', 
        'div[class*="modal"] button[aria-label="Close"]',
        'div[role="dialog"] button[aria-label="Close"]',
        '.semi-modal-close' // Common class for Doubao/ByteDance apps using Semi Design
    ];

    for (const selector of closeSelectors) {
        try {
            const closeBtn = await this.page.$(selector);
            if (closeBtn && await closeBtn.isVisible()) {
                console.log(`Popup detected (${selector}), closing...`);
                await closeBtn.click();
                await this.page.waitForTimeout(500);
            }
        } catch (e) {
            // Ignore errors during popup check
        }
    }
  }

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    // Check and handle popups before interacting
    await this.handlePopups();

    // Wait for input
    await this.page.waitForSelector(selectors.input, { state: 'visible' });
    
    // Focus and Type query
    // Handle multiple input boxes (sometimes there's a hidden one and a visible one)
    const baseSelector = 'textarea, div[contenteditable="true"]';
    const allInputs = this.page.locator(baseSelector);
    const count = await allInputs.count();
    
    let targetInputLocator = null;
    
    console.log(`Found ${count} potential input elements.`);

    // Find the last VISIBLE input
    for (let i = count - 1; i >= 0; i--) {
        const locator = allInputs.nth(i);
        if (await locator.isVisible()) {
            console.log(`Input at index ${i} is visible. Using this one.`);
            targetInputLocator = locator;
            break;
        }
    }

    if (!targetInputLocator) {
        console.log('No visible input found, falling back to first one.');
        targetInputLocator = allInputs.first();
    }

    await targetInputLocator.click();
    await this.page.waitForTimeout(500);
    
    // Clear content manually (Cmd+A + Backspace)
    await this.page.keyboard.press('Meta+A');
    await this.page.keyboard.press('Backspace');

    await this.page.keyboard.type(query, { delay: 100 }); 
    await this.page.waitForTimeout(500);

    // Force Input Event
    await targetInputLocator.evaluate((el) => {
        console.log('Dispatching events on active element:', el.tagName, el.className);
        const event = new Event('input', { bubbles: true, cancelable: true });
        el.dispatchEvent(event);
        el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: el.textContent || el.value }));
    });
    
    await this.page.waitForTimeout(1000);
    const submitBtn = await this.page.$(selectors.submit);
    if (submitBtn) {
        const isDisabled = await submitBtn.getAttribute('disabled');
        const className = await submitBtn.getAttribute('class');
        console.log(`Submit button found. Disabled: ${isDisabled}, Class: ${className}`);
        
        // Ensure enabled
        if (isDisabled !== null) {
            console.log('Force enabling submit button...');
            await this.page.evaluate((selector) => {
                const btn = document.querySelector(selector);
                if (btn) btn.removeAttribute('disabled');
            }, selectors.submit);
        }
    } else {
        console.log('Submit button NOT found!');
    }

    // Try pressing Enter first
    console.log('Pressing Enter to submit...');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);

    // Check if input is empty (success indicator)
    const inputValue = await this.page.$eval(selectors.input, el => el.value || el.innerText || el.textContent);
    console.log(`Input value after Enter: "${inputValue.trim()}"`);

    if (inputValue.trim().length === 0) {
        console.log('Input is empty, assume sent.');
        return;
    }

    // Backup: Click submit
    if (submitBtn && await submitBtn.isVisible()) {
        console.log('Submit button visible, trying click...');
        try {
             await submitBtn.click({ force: true });
        } catch (e) {
             console.log('Standard click failed, trying JS click...');
             await this.page.evaluate((selector) => {
                 const btn = document.querySelector(selector);
                 if (btn) btn.click();
             }, selectors.submit);
        }
    }
  }

  async extractResponse() {
    const selectors = this.modelConfig.selectors;
    
    // Wait for the response to start generating
    try {
        await this.page.waitForSelector(selectors.response, { timeout: 30000 });
    } catch (e) {
        console.log('Response selector not found within 30s.');
        return null;
    }
    
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
        try {
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
        } catch (e) {
            console.log('Error checking stability, retrying...', e.message);
        }
        
        await this.page.waitForTimeout(1000);
    }
    
    console.log('Warning: Timeout waiting for generation to complete.');
  }
}

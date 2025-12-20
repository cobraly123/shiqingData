import { BasePage } from './BasePage.js';

export class KimiPage extends BasePage {
  constructor(page) {
    super(page, 'kimi');
  }

  async navigate() {
    console.log(`Navigating to ${this.modelConfig.url}...`);
    try {
        await this.page.goto(this.modelConfig.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        // Optional: wait for a specific element instead of networkidle
        await this.page.waitForTimeout(2000); 
    } catch (e) {
        console.log('Navigation timeout or error, but continuing if possible...', e.message);
    }
  }

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    // Wait for input
    await this.page.waitForSelector(selectors.input, { state: 'visible' });
    
    // Type query
    await this.page.fill(selectors.input, query);
    await this.page.waitForTimeout(1000);

    // Try pressing Enter
    console.log('Pressing Enter to submit...');
    await this.page.press(selectors.input, 'Enter');
    await this.page.waitForTimeout(1000);

    // Backup: Click submit
    const submitBtn = await this.page.$(selectors.submit);
    if (submitBtn && await submitBtn.isVisible()) {
        console.log('Clicking submit button as backup...');
        try {
             await submitBtn.click({ force: true });
        } catch (e) {
            console.log('Click failed:', e.message);
        }
    }
  }

  async handleLogin() {
    console.log('Checking login status for Kimi...');
    
    let cookieInjectionAttempted = false;

    // 1. Auto-login via Cookie Injection (Priority)
    if (this.modelConfig.auth && this.modelConfig.auth.cookies) {
        const rawCookies = this.modelConfig.auth.cookies.trim();
        
        // Check if it looks like a cookie string (contains '=' and not just a token)
        // A simple check: if it starts with 'ey', it's likely a JWT token, not a cookie string.
        if (rawCookies.length > 0 && rawCookies.includes('=') && !rawCookies.startsWith('eyJ')) {
            console.log('Injecting Kimi cookies...');
            
            // Clear existing cookies
            await this.page.context().clearCookies();
    
            const cookieArray = rawCookies.split('; ').map(pair => {
                const index = pair.indexOf('=');
                if (index === -1) return null;
                const name = pair.substring(0, index);
                const value = pair.substring(index + 1);
                return {
                    name: name.trim(),
                    value: value.trim(),
                    domain: '.kimi.com', // Adjust domain if needed
                    path: '/',
                    secure: true
                };
            }).filter(c => c !== null);
    
            if (cookieArray.length > 0) {
                await this.page.context().addCookies(cookieArray);
                
                console.log(`Injected ${cookieArray.length} cookies. Reloading page...`);
                await this.page.reload();
                await this.page.waitForTimeout(5000);
                
                cookieInjectionAttempted = true;

                try {
                    await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 10000, state: 'visible' });
                    console.log('Auto-login successful via Cookies!');
                    return true;
                } catch (e) {
                    console.error('Auto-login failed after cookie injection.');
                }
            } else {
                console.log('Parsed cookie array is empty. Skipping cookie injection.');
            }
        } else {
             console.log('Provided cookie string does not look like valid cookies (might be a token). Skipping cookie injection.');
        }
    }

    // 2. Auto-login via Token Injection (Fallback)
    // We prioritize token injection to ensure a valid authenticated session
    if (this.modelConfig.auth && this.modelConfig.auth.token) {
        // Avoid double reload if we just tried cookies and failed
        if (!cookieInjectionAttempted) {
             console.log('Checking token configuration...');
        } else {
             console.log('Falling back to Token injection...');
        }

        const token = this.modelConfig.auth.token;
        if (token && token.startsWith('eyJ')) {
            console.log('Injecting Kimi access token...');
            
            // Clear existing tokens
            await this.page.evaluate(() => localStorage.clear());
            
            await this.page.evaluate((token) => {
                localStorage.setItem('access_token', token);
                localStorage.setItem('refresh_token', token);
            }, token);
            
            console.log('Token injected. Reloading page...');
            await this.page.reload();
            await this.page.waitForTimeout(5000); // Wait for app to load
            
            try {
                await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 15000, state: 'visible' });
                console.log('Auto-login successful via Token!');
                return true;
            } catch (e) {
                console.error('Auto-login failed after token injection.');
            }
        } else {
            console.log('Invalid token format (should be JWT). Skipping token injection.');
        }
    }

    try {
      await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 5000, state: 'visible' });
      console.log('Already logged in (or guest mode).');
      return true;
    } catch (e) {
      console.log('Login required.');
    }


    console.log('Please login manually to Kimi (Moonshot).');
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

  async handlePopups() {
    console.log('Checking for popups (Smart Scan)...');
    
    // 1. Defined Selectors (Fast & Specific)
    // Keep adding known specific cases here for speed
    const knownSelectors = [
        'div[class*="christmas-dialog"] .close',
        'div[class*="christmas-dialog"] svg',
        'div[class*="christmas-dialog"] [class*="close"]',
        'div[class*="christmas-dialog"] img',
        'div[class*="download-guide"] .close',
        'div[class*="promotion"] .close',
        '.popover-close',
        'button[aria-label="Close"]',
        'button[aria-label="关闭"]',
        'button:has-text("我知道了")',
        'button:has-text("关闭")'
    ];

    // Try known selectors first
    for (const selector of knownSelectors) {
        try {
            const el = await this.page.$(selector);
            if (el && await el.isVisible()) {
                console.log(`Known popup detected (${selector}), closing...`);
                await el.click();
                await this.page.waitForTimeout(500);
                return; // Return early if handled
            }
        } catch (e) {}
    }

    // 2. Generic DOM Scan (In-Browser execution for complex logic)
    // This finds any visible dialog/modal and tries to find a close button inside it
    const closedGeneric = await this.page.evaluate(() => {
        // Keywords that usually indicate a popup container
        const popupKeywords = ['dialog', 'modal', 'popup', 'overlay', 'promotion', 'banner', 'guide'];
        
        // Helper to check if element is visible
        const isVisible = (el) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && el.offsetWidth > 0 && el.offsetHeight > 0;
        };

        // Find potential containers
        const divs = document.querySelectorAll('div, section, aside');
        for (const div of divs) {
            const className = (div.className || '').toLowerCase();
            const role = div.getAttribute('role');
            
            // Check if it matches popup criteria
            const isPopup = role === 'dialog' || 
                            role === 'alertdialog' || 
                            popupKeywords.some(kw => className.includes(kw));
            
            if (isPopup && isVisible(div)) {
                // It looks like a popup. Look for a close button inside.
                // 1. Look for explicit close buttons
                const closeBtn = div.querySelector('button[aria-label*="Close"], button[aria-label*="关闭"], .close, [class*="close"], svg, img[alt*="close"]');
                
                if (closeBtn && isVisible(closeBtn)) {
                    closeBtn.click();
                    return `Closed generic popup: ${className}`;
                }
                
                // 2. Look for text buttons like "Close", "No thanks"
                const buttons = div.querySelectorAll('button, div[role="button"]');
                for (const btn of buttons) {
                    if (isVisible(btn)) {
                        const text = btn.innerText.trim();
                        if (['关闭', 'close', '我知道了', 'no thanks', 'later'].some(t => text.toLowerCase().includes(t))) {
                            btn.click();
                            return `Closed generic popup via text "${text}" in ${className}`;
                        }
                    }
                }
            }
        }
        return null;
    });

    if (closedGeneric) {
        console.log(closedGeneric);
        await this.page.waitForTimeout(500);
    }
  }

  // New method to handle elements blocking our click
  async handleBlockingElement(errorMessage) {
      console.log('Attempting to remove blocking element based on error...');
      
      // Try to parse the tag and class from error message
      // Error format usually: ... <div class="christmas-dialog">...</div> intercepts pointer events ...
      const match = errorMessage.match(/<(\w+)([^>]*?)>.*?intercepts pointer events/);
      
      if (match) {
          const tagName = match[1];
          const attrs = match[2]; // e.g. ' class="foo" id="bar"'
          
          console.log(`Detected intercepting element: <${tagName} ${attrs}>`);
          
          // Use page.evaluate to find and remove this specific element
          // This is aggressive ("Nuke it") but effective for automation if we can't close it nicely
          await this.page.evaluate(({tagName, attrs}) => {
              // Helper to match attributes crudely
              const elements = document.querySelectorAll(tagName);
              for (const el of elements) {
                  // If the element's outerHTML includes some unique parts of the error message, it's likely the one
                  // Or we can just check if it covers the center of the screen
                  if (el.outerHTML.includes(attrs.trim().split(' ')[0])) { // Simple heuristic
                      console.log('Removing blocking element from DOM');
                      el.remove();
                  }
              }
              
              // Fallback: Remove top-most covering element
              // This is risky but solves "invisible overlay" issues
              const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
              if (centerEl && centerEl !== document.body) {
                   // If it's a dialog/overlay, remove it
                   if (centerEl.className.includes('dialog') || centerEl.className.includes('modal') || parseInt(getComputedStyle(centerEl).zIndex) > 1000) {
                       centerEl.remove();
                   }
              }
          }, { tagName, attrs });
      }
  }

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    // Wait for input to be visible
    await this.page.waitForSelector(selectors.input, { state: 'visible' });
    
    // Check for and close any blocking dialogs
    await this.handlePopups();

    // Small wait to ensure focus
    await this.page.waitForTimeout(500);

    // Type query
    await this.page.fill(selectors.input, query);
    
    // Wait for UI to update (button enablement)
    await this.page.waitForTimeout(1000);
    
    // Try to find and click submit button first
    let submitBtn = await this.page.$(selectors.submit);
    if (submitBtn && await submitBtn.isVisible()) {
        console.log('Submit button found, clicking...');
        try {
            // First try a normal click to see if it works
            await submitBtn.click({ timeout: 2000 }); 
        } catch (e) {
             console.log('First click failed. Error:', e.message);
             
             // Check if it was an interception error
             if (e.message.includes('intercepts pointer events')) {
                 await this.handleBlockingElement(e.message);
             } else {
                 console.log('Handling popups (generic scan)...');
                 await this.handlePopups();
             }
             
             // Wait a bit for overlays to fade
             await this.page.waitForTimeout(1000);
 
             // Re-query button just in case
             submitBtn = await this.page.$(selectors.submit);
             if (submitBtn) {
                 // Check if disabled
                 const isDisabled = await submitBtn.getAttribute('disabled') !== null;
                 console.log(`Retry: Button found. Disabled: ${isDisabled}`);
 
                 if (isDisabled) {
                     console.log('Button is disabled, triggering input events...');
                     await this.page.click(selectors.input);
                     await this.page.keyboard.type(' ');
                     await this.page.keyboard.press('Backspace');
                     await this.page.waitForTimeout(500);
                 }
 
                 console.log('Retrying click...');
                 try {
                    await submitBtn.click({ timeout: 5000 });
                 } catch (e2) {
                    console.log('Retry click failed:', e2.message);
                    console.log('Attempting force click (bypassing checks)...');
                    await submitBtn.click({ force: true });
                 }
             }
        }
    } else {
        console.log('Submit button not found, pressing Enter...');
        await this.page.press(selectors.input, 'Enter');
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

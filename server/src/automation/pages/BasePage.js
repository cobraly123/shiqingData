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
    await this.page.goto(this.modelConfig.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Handle popups after navigation
    await this.checkAndClosePopups();
  }

  // Abstract method - must be implemented by subclasses
  async isLoggedIn() {
    throw new Error('isLoggedIn() must be implemented by subclass');
  }

  /**
   * Helper to check login status via Network Response.
   * This is more reliable than UI selectors.
   * @param {string|RegExp} urlPattern - The API URL pattern to listen for
   * @param {number} timeout - Timeout in ms (default 5000)
   * @returns {Promise<boolean>}
   */
  async checkLoginByNetwork(urlPattern, timeout = 5000) {
    console.log(`Checking login via network for pattern: ${urlPattern}`);
    try {
      // Create a promise that resolves when a matching response is received
      const responsePromise = this.page.waitForResponse(
        (response) => 
          (typeof urlPattern === 'string' ? response.url().includes(urlPattern) : urlPattern.test(response.url())) &&
          response.status() === 200,
        { timeout }
      );
      
      // Trigger a reload or an action that would cause the request
      // Note: In many cases, just being on the page is enough if we call this *before* navigation/reload finishes.
      // But if we are already on the page, we might need to trigger something.
      // For now, we assume this is called during/after a navigation/reload.
      
      await responsePromise;
      console.log('Network check passed: Auth API returned 200 OK.');
      return true;
    } catch (e) {
      console.log('Network check failed or timed out (not necessarily logged out, just not confirmed via network yet).');
      return false;
    }
  }

  async handleLogin(shouldWait = true) {
    console.log(`Checking login status for ${this.modelConfig.name}...`);
    
    // 1. Check if already logged in
    try {
        if (await this.isLoggedIn()) {
            console.log('Already logged in.');
            return true;
        }
    } catch (e) {
        console.log(`Login check failed: ${e.message}. Proceeding to auto-login.`);
    }

    // 2. Try Cookie Injection
    if (this.modelConfig.auth && this.modelConfig.auth.cookies) {
        console.log('Attempting auto-login via Cookie Injection...');
        // Default to hostname without www if not provided
        let domain = this.modelConfig.auth.cookieDomain;
        if (!domain) {
            try {
                const urlObj = new URL(this.modelConfig.url);
                domain = urlObj.hostname.replace('www.', '.');
                // Ensure it starts with dot for wider coverage if it's not a top level domain alone
                if (!domain.startsWith('.')) domain = '.' + domain;
            } catch (e) {
                console.error('Failed to parse domain from URL', e);
            }
        }
        
        await this.injectCookies(this.modelConfig.auth.cookies, domain);
        
        // Reload and check again
        console.log('Reloading page after cookie injection...');
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(5000); // Wait for auth check
        await this.checkAndClosePopups();

        try {
            if (await this.isLoggedIn()) {
                console.log('Auto-login successful via Cookies!');
                return true;
            }
        } catch (e) {
             console.error('Login check failed after injection.');
        }
        console.error('Login failed even after cookie injection.');
    } else {
        console.log('No cookies configured for auto-login.');
    }

    console.log(`Please login manually to ${this.modelConfig.name}.`);
    
    if (!shouldWait) {
        return false;
    }

    return await this.waitForManualLogin();
  }

  async waitForManualLogin() {
     // Wait for manual login (generic implementation)
     // We look for the chat input as a sign of successful login
     console.log('Waiting for user to complete login (timeout: 5 min)...');
     try {
         await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 300000, state: 'visible' });
         console.log('Login detected! Chat input is visible.');
         return true;
     } catch (e) {
         console.error('Timeout waiting for login to complete.');
         return false;
     }
  }

  async injectCookies(rawCookies, domain) {
      if (!rawCookies) return;
      
      console.log(`Injecting cookies for domain: ${domain}`);
      await this.page.context().clearCookies();

      const cookieArray = [];
      // Handle JSON format
      if (rawCookies.trim().startsWith('[')) {
          try {
              const parsed = JSON.parse(rawCookies);
              parsed.forEach(c => {
                  cookieArray.push({ ...c, domain: c.domain || domain, path: c.path || '/' });
              });
          } catch (e) {
              console.error('Failed to parse JSON cookies:', e);
          }
      } else {
          // Handle string format (key=value; key2=value2)
          const pairs = rawCookies.split('; ');
          for (const pair of pairs) {
              const index = pair.indexOf('=');
              if (index === -1) continue;
              const name = pair.substring(0, index).trim();
              const value = pair.substring(index + 1).trim();
              
              cookieArray.push({
                  name,
                  value,
                  domain: domain,
                  path: '/',
                  secure: true
              });
          }
      }

      if (cookieArray.length > 0) {
          console.log(`Injecting ${cookieArray.length} cookies for domain: ${domain}`);
          cookieArray.forEach(c => console.log(` - Cookie: ${c.name} (Domain: ${c.domain})`));
          await this.page.context().addCookies(cookieArray);
          console.log(`Injected ${cookieArray.length} cookies.`);
      }
  }

  /**
   * Injects LocalStorage data into the page.
   * @param {Object} localStorageData - Key-value pairs to inject into LocalStorage.
   */
  async injectLocalStorage(localStorageData) {
      if (!localStorageData || Object.keys(localStorageData).length === 0) {
          console.log('No LocalStorage data to inject.');
          return;
      }

      console.log(`Injecting ${Object.keys(localStorageData).length} items into LocalStorage...`);
      
      await this.page.evaluate((data) => {
          for (const key in data) {
              localStorage.setItem(key, data[key]);
          }
      }, localStorageData);
      
      console.log('LocalStorage injection complete.');
  }

  async checkAndClosePopups() {
      const popupSelectors = this.modelConfig.selectors.popups;
      if (!popupSelectors || popupSelectors.length === 0) return;

      console.log('Checking for popups...');
      for (const selector of popupSelectors) {
          try {
              // Quick check with short timeout
              const popup = await this.page.$(selector);
              if (popup && await popup.isVisible()) {
                  console.log(`Closing popup: ${selector}`);
                  await popup.click();
                  await this.page.waitForTimeout(500); // Wait for animation
              }
          } catch (e) {
              // Ignore errors (popup might not exist)
          }
      }
  }

  /**
   * Extract sources/citations from the response element.
   * Can be overridden by subclasses for specific logic.
   * @param {ElementHandle} responseElement 
   * @returns {Promise<Array>} Array of { title, url }
   */
  async extractSources(responseElement) {
    // Default implementation: Look for generic links in the response
    const sources = [];
    try {
        // Try to find links that look like references
        const links = await responseElement.$$('a');
        for (const link of links) {
            const href = await link.getAttribute('href');
            const text = await link.innerText();
            
            // Basic filtering: ignore internal links or empty hrefs
            if (href && (href.startsWith('http') || href.startsWith('www'))) {
                sources.push({ title: text || href, url: href });
            }
        }
    } catch (e) {
        console.warn('Error extracting sources in BasePage:', e);
    }
    return sources;
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

  async waitForResponse(timeout = 60000) {
    const selectors = this.modelConfig.selectors;
    console.log(`Waiting for response from ${this.modelConfig.name}...`);
    
    try {
        // 1. Wait for response container to appear
        await this.page.waitForSelector(selectors.response, { timeout: 30000 });
        
        // 2. Poll for stability
        // Most LLMs stream text. We wait until text length hasn't changed for N seconds.
        let lastText = '';
        let stableCount = 0;
        const checkInterval = 1000;
        const stabilityThreshold = 3; // 3 seconds of no change
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const currentResponse = await this.extractResponse();
            
            // Normalize for comparison
            const currentText = (typeof currentResponse === 'object' && currentResponse?.text) 
                ? currentResponse.text 
                : currentResponse;

            const lastTextContent = (typeof lastText === 'object' && lastText?.text)
                ? lastText.text
                : lastText;

            if (currentText && currentText.length > 0 && JSON.stringify(currentResponse) === JSON.stringify(lastText)) {
                stableCount++;
                if (stableCount >= stabilityThreshold) {
                    return currentResponse;
                }
            } else {
                stableCount = 0;
                lastText = currentResponse || '';
            }
            
            await this.page.waitForTimeout(checkInterval);
        }
        
        console.warn(`Timeout waiting for response from ${this.modelConfig.name}, returning what we have.`);
        return lastText;

    } catch (e) {
        console.error(`Error waiting for response from ${this.modelConfig.name}:`, e);
        return null;
    }
  }

  async extractResponse() {
    const selectors = this.modelConfig.selectors;
    try {
        // Get all response elements and pick the last one usually
        const responses = await this.page.$$(selectors.response);
        if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            // Use innerText instead of textContent to preserve newlines and formatting
            const text = await lastResponse.innerText();
            const sources = await this.extractSources(lastResponse);
            const rawHtml = await lastResponse.innerHTML();
            
            return {
                text,
                sources,
                rawHtml
            };
        }
        return null;
    } catch (e) {
        console.error('Failed to extract response:', e);
        return null;
    }
  }
}

import { BasePage } from './BasePage.js';

export class DoubaoPage extends BasePage {
  constructor(page) {
    super(page, 'doubao');
  }

  async isLoggedIn() {
      // Strategy 1: Check for Login button (Fastest fail)
      const loginBtn = await this.page.$('button[data-testid="login_button"], button:has-text("登录"), div[class*="login-btn"]');
      if (loginBtn && await loginBtn.isVisible()) {
          console.log('Login button detected. Not logged in.');
          return false;
      }

      // Strategy 2: Network Check (Most Reliable)
      // Doubao calls /api/v1/user/get or similar
      // We rely on handleLogin to set up the listener for this, but if called independently,
      // we fall back to UI check.

      // Strategy 3: Check for Input (Fallback)
      const input = await this.page.$(this.modelConfig.selectors.input);
      if (input && await input.isVisible()) {
          return true;
      }
      
      return false;
  }

  async handleLogin() {
    // Setup Network Listener
    // Doubao often uses /api/v1/user/get or /api/v1/conversation/list
    const authCheckPromise = this.checkLoginByNetwork(/api\/v\d+\/(user|conversation)/, 10000);

    // Call super.handleLogin which does the cookie injection and reload
    const loginResult = await super.handleLogin(false); // Do not wait manually yet

    // Check Network Result
    try {
        const isNetworkAuth = await Promise.race([
            authCheckPromise,
            new Promise(r => setTimeout(() => r(false), 1000)) // Short race
        ]);
        if (isNetworkAuth) {
             console.log('Login confirmed via Network!');
             return true;
        }
    } catch (e) {}

    if (loginResult) {
        return true;
    }

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

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    // Check and handle popups before interacting
    await this.checkAndClosePopups();

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
        try {
            await submitBtn.click();
        } catch (e) {
             console.log('Click failed, trying force click', e.message);
             await submitBtn.click({ force: true });
        }
    } else {
        await this.page.press(selectors.input, 'Enter');
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
            return await lastResponse.innerText();
        }
        return null;
    } catch (e) {
        console.error('Failed to extract response:', e);
        return null;
    }
  }
}

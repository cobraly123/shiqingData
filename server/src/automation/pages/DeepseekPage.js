import { BasePage } from './BasePage.js';

export class DeepseekPage extends BasePage {
  constructor(page) {
    super(page, 'deepseek');
  }

  async isLoggedIn() {
      // Strategy 1: Network Check (Most Reliable)
      // Deepseek usually calls /api/v0/users/current or similar
      // We assume this check is run during a reload/navigation phase or after injection
      
      // Strategy 2: Check for Input
      try {
        await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 5000, state: 'visible' });
        return true;
      } catch (e) {
        return false;
      }
  }

  async handleLogin() {
    // 0. Network Check Setup (Before reload)
    // Common pattern for Deepseek API: api/v0/users/current, api/v0/chat/history
    const authCheckPromise = this.checkLoginByNetwork(/api\/v0\/(users|chat)/, 10000);

    // 1. Try standard BasePage login (Cookie Injection) WITHOUT waiting
    // We pass false to handleLogin to skip the manual wait, because we want to check UserToken next
    // But first, let's see if the standard injection triggers our network check
    const baseLoginResult = await super.handleLogin(false);
    
    // Check if network confirmed login during base login attempt
    try {
        const isNetworkAuth = await Promise.race([
            authCheckPromise,
            new Promise(r => setTimeout(() => r(false), 2000)) // Short race just to check current status
        ]);
        if (isNetworkAuth) {
             console.log('Login confirmed via Network (Standard Injection)!');
             return true;
        }
    } catch (e) {}

    if (baseLoginResult) {
        return true;
    }

    // 2. Special handling for Deepseek UserToken (LocalStorage)
    if (this.modelConfig.auth && this.modelConfig.auth.userToken) {
        console.log('Injecting Deepseek userToken into LocalStorage...');
        
        // We need to be on the domain to access localStorage
        if (!this.page.url().includes('deepseek.com')) {
             await this.page.goto('https://chat.deepseek.com/sign_in', { waitUntil: 'domcontentloaded' });
        }

        const tokenValue = this.modelConfig.auth.userToken;
        await this.page.evaluate((token) => {
            localStorage.setItem('userToken', token);
        }, tokenValue);
        
        console.log('LocalStorage injection complete. Reloading and listening for auth signals...');
        
        // Re-arm network check for this reload
        const tokenAuthCheckPromise = this.checkLoginByNetwork(/api\/v0\/(users|chat)/, 10000);
        
        await this.page.reload();
        
        try {
            const isNetworkAuth = await tokenAuthCheckPromise;
            if (isNetworkAuth) {
                console.log('Login confirmed via Network (UserToken)!');
                return true;
            }
        } catch (e) {
             console.log('Network auth check timed out for UserToken.');
        }

        if (await this.isLoggedIn()) {
             console.log('Auto-login successful via UserToken (UI Verified)!');
             return true;
        } else {
             console.error('Auto-login failed after UserToken injection.');
        }
    }

    console.log('Please login manually to Deepseek.');
    return await this.waitForManualLogin();
  }

  async waitForResponse(timeout = 180000) {
    console.log('Waiting for Deepseek response...');
    const selectors = this.modelConfig.selectors;
    
    try {
        // 1. Wait for any response container to appear
        await this.page.waitForSelector(selectors.response, { timeout: 30000 });
        
        // 2. Poll for stability
        let lastText = '';
        let stableCount = 0;
        const checkInterval = 2000; // Check every 2 seconds
        const stabilityThreshold = 10; // 10 checks * 2s = 20 seconds of stability
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const responses = await this.page.$$(selectors.response);
            if (responses.length === 0) {
                await this.page.waitForTimeout(checkInterval);
                continue;
            }
            
            const lastResponse = responses[responses.length - 1];
            
            // Try to get the full content using a robust extraction method
            // innerText can be affected by visibility/styling, textContent loses formatting.
            // We use evaluate to manually construct the text with newlines.
            const currentText = await lastResponse.evaluate(el => {
                // Helper to get text with newlines
                function getText(node) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        return node.nodeValue;
                    }
                    if (node.nodeType !== Node.ELEMENT_NODE) {
                        return '';
                    }
                    
                    let text = '';
                    const style = window.getComputedStyle(node);
                    const isBlock = style.display === 'block' || style.display === 'flex' || style.display === 'grid' || node.tagName === 'P' || node.tagName === 'DIV' || node.tagName === 'BR';
                    
                    if (node.tagName === 'BR') {
                        return '\n';
                    }
                    
                    for (const child of node.childNodes) {
                        text += getText(child);
                    }
                    
                    // Add newline for block elements if not already ending with one
                    if (isBlock && !text.endsWith('\n')) {
                        text += '\n';
                    }
                    return text;
                }
                return getText(el);
            }); 
            
            if (currentText && currentText.length > 0 && currentText === lastText) {
                stableCount++;
                // console.log(`Response stable for ${stableCount * (checkInterval/1000)}s...`);
                if (stableCount >= stabilityThreshold) {
                    console.log(`Response stabilized for ${stableCount * (checkInterval/1000)}s. Finishing.`);
                    console.log(`[DEBUG] DeepseekPage captured length: ${currentText.length}`);
                    console.log(`[DEBUG] DeepseekPage last 100 chars: ${currentText.slice(-100)}`);
                    return currentText; 
                }
            } else {
                stableCount = 0;
                lastText = currentText || '';
                // If text is growing, reset stability count
                if (currentText && currentText.length > 0) {
                    console.log(`Response updated. Length: ${currentText.length} chars.`);
                }
            }
            
            await this.page.waitForTimeout(checkInterval);
        }
        
        console.warn('Timeout waiting for response stabilization, returning current text.');
        return lastText;
        
    } catch (e) {
        console.error('Error waiting for Deepseek response:', e);
        return null;
    }
  }
}

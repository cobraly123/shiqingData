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
        await this.checkAndClosePopups();
    } catch (e) {
        console.log('Navigation timeout or error, but continuing if possible...', e.message);
    }
  }

  async isLoggedIn() {
      try {
        // Check for Login button first (Guest mode detection)
        // Kimi usually shows "登录/注册" or similar when not logged in
        const loginText = this.page.getByText('登录', { exact: true });
        const loginBtn = this.page.getByRole('button', { name: '登录' });
        
        if ((await loginText.isVisible()) || (await loginBtn.isVisible())) {
            console.log('Found "Login" text/button, determining as NOT logged in.');
            return false;
        }

        // Simple check: if input is visible, we are logged in
        await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 5000, state: 'visible' });
        return true;
      } catch (e) {
        return false;
      }
  }

  async handleLogin() {
    console.log('Checking login status for Kimi...');
    
    // Strategy 0: Direct Token Injection (Most Reliable for Kimi)
    if (this.modelConfig.auth.token) {
        console.log('Found KIMI_TOKEN, injecting into localStorage...');
        const token = this.modelConfig.auth.token;
        
        await this.page.evaluate((t) => {
            localStorage.setItem('access_token', t);
            localStorage.setItem('refresh_token', t);
            console.log('Injected access_token and refresh_token into localStorage');
        }, token);
        
        // Reload to apply changes
        console.log('Reloading page to apply token...');
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(3000);
        
        if (await this.isLoggedIn()) {
            console.log('Login successful via Token Injection!');
            return true;
        } else {
            console.log('Token Injection failed to log in. Token might be expired.');
        }
    }

    // Strategy 1: Inject LocalStorage JSON if configured (Legacy)
    if (this.modelConfig.auth.localStorage) {
         let lsData = {};
         try {
             lsData = JSON.parse(this.modelConfig.auth.localStorage);
         } catch(e) {
             console.error('Failed to parse KIMI_LOCAL_STORAGE JSON:', e);
         }
         
         if (Object.keys(lsData).length > 0) {
             console.log('Injecting LocalStorage JSON for Kimi...');
             await this.injectLocalStorage(lsData);
             await this.page.reload();
             await this.page.waitForTimeout(3000);
         }
    }
    
    // Strategy 2: Standard Cookie Injection
    return await super.handleLogin(true);
   }

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    await this.checkAndClosePopups();
    
    // Wait for input
    const input = await this.page.waitForSelector(selectors.input, { state: 'visible' });
    
    // Focus and Type query
     await input.click();
     await input.focus();
     await this.page.waitForTimeout(500);
     await input.fill(query);
     
     // Dispatch input event to ensure React/Vue detects change
     await input.dispatchEvent('input', { bubbles: true });
     await input.dispatchEvent('change', { bubbles: true });
     await this.page.waitForTimeout(1000);
 
     // Try pressing Enter
     console.log('Pressing Enter to submit...');
     await this.page.keyboard.press('Enter');
     await this.page.waitForTimeout(2000);
 
     // Check if input is cleared (message sent)
     const inputValue = await input.innerText();
     if (inputValue.trim() === '') {
         console.log('Input cleared, assuming message sent via Enter.');
         return;
     }
 
     console.log('Input not cleared, trying submit button...');
 
     // Backup: Click submit
     // Try to find the button more robustly
     let submitBtn = await this.page.$(selectors.submit);
     if (submitBtn) {
         // Check if it's a container and has a child button/icon
         const childBtn = await submitBtn.$('button, svg, div[role="button"]');
         if (childBtn) {
             console.log('Found child element in submit container, using that.');
             submitBtn = childBtn;
         }

         if (await submitBtn.isVisible()) {
             const isDisabled = await submitBtn.isDisabled();
             const isEnabledClass = await submitBtn.getAttribute('class');
             // Kimi submit button might be a div, so isDisabled() might not work. Check class for 'disabled'.
             
             console.log(`Found submit button. Classes: ${isEnabledClass}`);
             
             console.log('Clicking submit button as backup...');
             await submitBtn.click({ force: true });
             await this.page.waitForTimeout(2000);
        } else {
            console.log('Submit button found but not visible.');
        }
    } else {
        console.log('Submit button not found with selector:', selectors.submit);
    }
  }

  async waitForResponse(timeout = 300000) {
      console.log('Kimi: Waiting for response...');
      const selectors = this.modelConfig.selectors;
      
      // 1. Wait for response container
      try {
          await this.page.waitForSelector(selectors.response, { timeout: 30000 });
      } catch(e) {
          console.error('Kimi: Response selector not found');
          return null;
      }

      // 2. Wait for generation to complete (robust check)
      await this.waitForGenerationToComplete(selectors.response);
      
      // 3. Extract and return
      return await this.extractResponse();
  }

  async extractResponse() {
      const selectors = this.modelConfig.selectors;
      // Just extract, do NOT wait here to avoid double-waiting loops
      try {
          const responses = await this.page.$$(selectors.response);
          if (responses.length > 0) {
              let lastResponse = responses[responses.length - 1];
              
              // Debug info
              const className = await lastResponse.getAttribute('class');
              console.log(`Kimi: Selected response element class: ${className}`);
              
              // If we selected the inner markdown, try to find the container to include references
                if (className && className.includes('markdown')) {
                    try {
                        const parent = await lastResponse.evaluateHandle(el => el.parentElement);
                        if (parent) {
                            const parentText = await parent.innerText();
                            const markdownText = await lastResponse.innerText();
                            
                            console.log(`Debug: Markdown len: ${markdownText.length}, Parent len: ${parentText.length}`);
                            
                            // Check if parent has "Reference" related keywords or significantly more content
                            if (parentText.includes('参考资料') || 
                                parentText.includes('引用') || 
                                parentText.length > markdownText.length + 50) {
                                console.log('Parent has more content (likely references), using parent.');
                                lastResponse = parent;
                            } else {
                                // Global search for references if not found in parent
                                const hasRefs = await this.page.evaluate(() => {
                                    // Look for elements containing "参考资料"
                                    const refs = Array.from(document.querySelectorAll('div, h3, h4, p, span'))
                                        .filter(el => el.innerText && (el.innerText.includes('参考资料') || el.innerText === '引用'));
                                    
                                    if (refs.length > 0) {
                                        // Return the class of the last found element (likely the one for the latest message)
                                        const lastRef = refs[refs.length - 1];
                                        return {
                                            found: true,
                                            className: lastRef.className,
                                            tagName: lastRef.tagName,
                                            text: lastRef.innerText,
                                            // Try to find a container for these refs
                                            containerClass: lastRef.parentElement ? lastRef.parentElement.className : null
                                        };
                                    }
                                    return { found: false };
                                });

                                if (hasRefs.found) {
                                    console.log('Found references globally:', hasRefs);
                                    // If we found references globally, we might need to select a common ancestor
                                    // But since we can't easily traverse from here, let's just note it.
                                    // Ideally, we find the common ancestor of 'lastResponse' and the reference element.
                                }
                                
                                // Try grandparent
                                const grandparent = await parent.evaluateHandle(el => el.parentElement);
                                if (grandparent) {
                                    const gpText = await grandparent.innerText();
                                    console.log(`Debug: Grandparent len: ${gpText.length}`);
                                    if (gpText.includes('参考资料') || gpText.length > parentText.length + 50) {
                                        console.log('Grandparent has references, using grandparent.');
                                        lastResponse = grandparent;
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.warn('Error checking parent element:', err);
                    }
                }

              const text = await lastResponse.innerText(); // Use innerText for better formatting
              return {
                  text: text,
                  rawHtml: await lastResponse.innerHTML()
              };
          }
      } catch (e) {
          console.error('Failed to extract response:', e);
      }
      return { text: '', rawHtml: '' };
  }

  async waitForGenerationToComplete(selector) {
      console.log('Waiting for generation to complete...');
      
      let lastText = '';
      let stableCount = 0;
      const maxRetries = 240; // 2 minutes max (240 * 500ms)
      const stabilityThreshold = 10; // 5 seconds stability (10 * 500ms)
      
      for (let i = 0; i < maxRetries; i++) {
          const elements = await this.page.$$(selector);
          if (elements.length === 0) {
              await this.page.waitForTimeout(500);
              continue;
          }
          
          const lastElement = elements[elements.length - 1];
          const currentText = await lastElement.textContent();
          
          // Check for "Searching" state (optional, if Kimi puts it in text)
          // For now, just rely on text stability
          
          if (currentText === lastText && currentText.length > 0) {
              stableCount++;
          } else {
              stableCount = 0;
              lastText = currentText;
          }
          
          if (stableCount >= stabilityThreshold) { 
              console.log(`Response stable for ${stabilityThreshold * 0.5} seconds. Generation complete.`);
              return;
          }
          
          await this.page.waitForTimeout(500);
      }
      console.log('Timeout waiting for generation to complete (stabilization).');
  }
}

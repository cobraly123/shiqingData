import { BasePage } from './BasePage.js';
import { KimiLogger } from '../utils/KimiLogger.js';

export class KimiPage extends BasePage {
  constructor(page) {
    super(page, 'kimi');
    this.logger = new KimiLogger();
    this.currentRequestData = {
      requestId: null,
      requestHeaders: {},
      responseHeaders: {},
      timestamp: null
    };
    this.monitoringActive = false;
    this.setupRequestMonitoring();
  }

  async setupRequestMonitoring() {
        if (this.monitoringActive) return;
        
        const fs = await import('fs');
        const path = await import('path');
        const logFile = path.join(process.cwd(), 'kimi_network_full.jsonl');
        
        // Clear previous log
        fs.writeFileSync(logFile, '');

        this.page.on('request', request => {
            const entry = {
                type: 'request',
                timestamp: new Date().toISOString(),
                url: request.url(),
                method: request.method(),
                headers: request.headers(),
                postData: request.postData()
            };
            fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
        });

        this.page.on('response', async response => {
            let body = '[Body too large or not text]';
            try {
                // Try to get text body for JSON/text responses
                const contentType = response.headers()['content-type'] || '';
                if (contentType.includes('application/json') || contentType.includes('text/')) {
                    body = await response.text();
                }
            } catch (e) {
                body = `[Error reading body: ${e.message}]`;
            }

            const entry = {
                type: 'response',
                timestamp: new Date().toISOString(),
                url: response.url(),
                status: response.status(),
                headers: response.headers(),
                body: body
            };
            fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
        });

        this.monitoringActive = true;
        console.log(`[KimiPage] Full network logging started. Log file: ${logFile}`);
    }

  async navigate() {
    console.log(`Navigating to ${this.modelConfig.url}...`);
    try {
        await this.page.goto(this.modelConfig.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.page.waitForTimeout(2000); 
        await this.checkAndClosePopups();
    } catch (e) {
        console.log('Navigation timeout or error, but continuing if possible...', e.message);
    }
  }

  async isLoggedIn() {
      try {
        const loginText = this.page.getByText('登录', { exact: true });
        const loginBtn = this.page.getByRole('button', { name: '登录' });
        
        if ((await loginText.isVisible()) || (await loginBtn.isVisible())) {
            console.log('Found "Login" text/button, determining as NOT logged in.');
            return false;
        }

        await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 5000, state: 'visible' });
        return true;
      } catch (e) {
        return false;
      }
  }

  async handleLogin() {
    console.log('Checking login status for Kimi...');
    
    if (this.modelConfig.auth.token) {
        console.log('Found KIMI_TOKEN, injecting into localStorage...');
        const token = this.modelConfig.auth.token;
        
        await this.page.evaluate((t) => {
            localStorage.setItem('access_token', t);
            localStorage.setItem('refresh_token', t);
            console.log('Injected access_token and refresh_token into localStorage');
        }, token);
        
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
    
    return await super.handleLogin(true);
   }

  async sendQuery(query) {
    this.currentQuery = query; // Store for logging
    this.currentRequestData = { // Reset for new query
      requestId: null,
      requestHeaders: {},
      responseHeaders: {},
      timestamp: null
    };

    const selectors = this.modelConfig.selectors;
    
    await this.checkAndClosePopups();
    
    const input = await this.page.waitForSelector(selectors.input, { state: 'visible' });
    
     await input.click();
     await input.focus();
     await this.page.waitForTimeout(500);
     await input.fill(query);
     
     await input.dispatchEvent('input', { bubbles: true });
     await input.dispatchEvent('change', { bubbles: true });
     await this.page.waitForTimeout(1000);
 
     console.log('Pressing Enter to submit...');
     await this.page.keyboard.press('Enter');
     await this.page.waitForTimeout(2000);
 
     const inputValue = await input.innerText();
     if (inputValue.trim() === '') {
         console.log('Input cleared, assuming message sent via Enter.');
         return;
     }
 
     console.log('Input not cleared, trying submit button...');
 
     let submitBtn = await this.page.$(selectors.submit);
     if (submitBtn) {
         const childBtn = await submitBtn.$('button, svg, div[role="button"]');
         if (childBtn) {
             console.log('Found child element in submit container, using that.');
             submitBtn = childBtn;
         }

         if (await submitBtn.isVisible()) {
             const isEnabledClass = await submitBtn.getAttribute('class');
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
      console.log(`Kimi: Waiting for response (timeout: ${timeout}ms)...`);
      const selectors = this.modelConfig.selectors;
      
      try {
          // Wait for the first sign of response or the final response container
          await this.page.waitForSelector(selectors.response, { timeout: timeout });
      } catch(e) {
          console.error('Kimi: Response selector not found within timeout');
          return null;
      }

      await this.waitForGenerationToComplete(selectors.response);
      
      return await this.extractResponse();
  }

  async extractResponse() {
    const selectors = this.modelConfig.selectors;
    try {
        const responses = await this.page.$$(selectors.response);
        if (responses.length > 0) {
            let lastResponse = responses[responses.length - 1];
            
            // 1. Extract Text
            // Use evaluate to get innerText, which handles line breaks better than playwright's element.innerText() in some cases
            // Also try to capture specific markdown content if structure is complex
            const text = await this.page.evaluate((el) => {
                // Remove reference superscripts (e.g. [1], [2]) to clean up text, or keep them?
                // Let's keep them for now as they are part of the content.
                
                // Helper to get text from nodes, handling potential shadow roots or weird structures
                return el.innerText;
            }, lastResponse);
            
            // 2. Expand References if needed
            await this.ensureReferencesExpanded();

            // 3. Extract Search Page List (from search panel/results)
            const searchResults = await this.extractSearchResults(lastResponse);
            
            // 4. Extract Reference Pages (citations)
            let references = await this.extractReferences(lastResponse);

            // [Fallback] If explicit references are missing, use search results as references
            if ((!references || references.length === 0) && searchResults.length > 0) {
                 console.log('Kimi: No explicit references found, using search results as references.');
                 references = searchResults.map(r => ({
                     ...r,
                     domain: r.source // Map source to domain for consistency
                 }));
            }

            // Format data as requested: 序号、信源域名、信源文章名、信源URL
            const formatSource = (item) => ({
                '序号': item.position,
                '信源域名': item.source || 'N/A',
                '信源文章名': item.title || 'N/A',
                '信源URL': item.url || ''
            });

            const formattedSearchResults = searchResults.map(formatSource);
            const formattedReferences = references.map(formatSource);

            const result = { 
                text, 
                searchResults,
                references,
                formattedSearchResults,
                formattedReferences,
                rawHtml: await lastResponse.innerHTML(),
                requestId: this.currentRequestData.requestId,
                metadata: {
                    timestamp: this.currentRequestData.timestamp,
                    query: this.currentQuery
                }
            };

            // Log the interaction
            this.logger.logInteraction({
                type: 'kimi_response',
                ...result
            });

            return result;
        }
    } catch (e) {
        console.warn('Error in Kimi extractResponse:', e);
        this.logger.logError({
            type: 'extraction_error',
            error: e.message,
            stack: e.stack,
            query: this.currentQuery
        });
    }
    return null;
  }

  async ensureReferencesExpanded() {
      try {
          const refToggle = this.page.locator('text="参考资料"').last();
          if (await refToggle.isVisible()) {
             // Optional: check if collapsed. Kimi usually shows them.
          }
      } catch (e) {}
  }

  async checkAndClosePopups() {
    try {
        // 1. Check for standard modal mask
        const modalMask = await this.page.$('.modal-mask');
        if (modalMask && await modalMask.isVisible()) {
            console.log('[KimiPage] Modal mask detected. Attempting to close...');
            
            // Try to find a close button inside the modal
            const closeBtn = await this.page.$('.modal-mask .close, .modal-mask [aria-label="Close"], .modal-mask [class*="close"]');
            if (closeBtn) {
                await closeBtn.click();
                console.log('[KimiPage] Clicked close button on modal.');
                await this.page.waitForTimeout(500);
            } else {
                // Try pressing Escape
                await this.page.keyboard.press('Escape');
                console.log('[KimiPage] Pressed Escape to close modal.');
                await this.page.waitForTimeout(500);
            }
        }

        // 2. Check for "Turbo" or other specific promos
        const promo = await this.page.$('[class*="turbo"], [class*="promotion"]');
        if (promo && await promo.isVisible()) {
            // Similar close logic
            const closePromo = await promo.$('[class*="close"]');
            if (closePromo) await closePromo.click();
        }

    } catch (error) {
        console.log('[KimiPage] Error checking popups:', error.message);
    }
  }

  async extractSearchResults(responseElement) {
    console.log('Kimi: Extracting search results...');
    
    try {
        return await this.page.evaluate(async (el) => {
            const results = [];
            
            // Helper to parse a site element
            const parseSite = (element, index) => {
                const titleEl = element.querySelector('.title');
                const snippetEl = element.querySelector('.snippet');
                const headerEl = element.querySelector('.header .name');
                const dateEl = element.querySelector('.header .date');
                
                return {
                    title: titleEl ? titleEl.innerText : '',
                    url: element.getAttribute('href'),
                    snippet: snippetEl ? snippetEl.innerText : '',
                    source: headerEl ? headerEl.innerText : '',
                    date: dateEl ? dateEl.innerText : '',
                    position: index + 1
                };
            };

            // Strategy 1: Check Global Side Console (Preferred)
            const sideConsoleSites = document.querySelectorAll('.side-console-container .sites a.site');
            if (sideConsoleSites.length > 0) {
                return Array.from(sideConsoleSites).map(parseSite);
            }

            // Strategy 2: Click "Search" toggle if available
            // Search toggle is usually BEFORE the response element
            let searchToggle = null;
            let curr = el;
            let checks = 0;
            
            // Look backwards for the toggle
            while (curr && checks < 20) {
                 if (curr.classList.contains('toolcall-title-container') || 
                     (curr.innerText && (curr.innerText.includes('搜索') || curr.innerText.includes('Search')) && curr.querySelector('svg'))) {
                     searchToggle = curr;
                     break;
                 }
                 // Also check previous sibling
                 if (curr.previousElementSibling) {
                     curr = curr.previousElementSibling;
                 } else {
                     // If no previous sibling, go up and check previous of parent
                     // But be careful not to jump to previous message
                     if (curr.parentElement && !curr.parentElement.classList.contains('chat-content-list')) {
                         curr = curr.parentElement;
                     } else {
                         break;
                     }
                 }
                 checks++;
            }

            if (searchToggle) {
                // Click it
                searchToggle.click();
                // Wait for UI update
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check side console again
                const newSideSites = document.querySelectorAll('.side-console-container .sites a.site');
                if (newSideSites.length > 0) {
                    return Array.from(newSideSites).map(parseSite);
                }
                
                // Check local expansion (if it expands inline)
                // Sometimes it expands into a .block-container sibling
                // We can reuse the previous sibling traversal logic here if needed
            }
            
            return []; // No results found
        }, responseElement);
    } catch (error) {
        console.error('Error extracting search results:', error);
        return [];
    }
  }

  // Requirement 3: Reference Page Retrieval
  async extractReferences(responseElement) {
    console.log('Kimi: Extracting references with context...');
    try {
        return await this.page.evaluate(async (el) => {
             // Strategy: Traverse up the DOM tree from the response element.
             // At each level, check next siblings for references.
             
             let currentEl = el;
             let resultsFound = false;
             let checks = 0;
             let targetElements = [];

             // 1. Look for Reference Toggle and Click (Priority)
             // Based on debugging: <div class="ref-action">...引用...</div>
             // Or <div class="segment-assistant-actions">...</div>
             let refToggle = null;
             let curr = el;
             checks = 0;
             
             // Traverse siblings and parents to find the toggle bar
             while (curr && checks < 20) {
                  if (curr.classList.contains('ref-action') || 
                      curr.classList.contains('segment-assistant-actions') || 
                      (curr.innerText && curr.innerText.includes('引用'))) {
                      
                      // It must be a likely toggle container
                      if (curr.classList.contains('ref-action') || 
                          curr.querySelector('.ref-action') ||
                          (curr.innerText.length < 50 && (curr.innerText.includes('引用') || curr.innerText.includes('Reference')))) {
                          
                          refToggle = curr;
                          // If it's a container, try to find the specific button
                          const specificBtn = curr.querySelector('.ref-action') || curr.querySelector('div[role="button"]');
                          if (specificBtn) refToggle = specificBtn;
                          
                          break;
                      }
                  }
                  
                  if (curr.nextElementSibling) {
                      curr = curr.nextElementSibling;
                  } else {
                      if (curr.parentElement && !curr.parentElement.classList.contains('chat-content-list')) {
                          curr = curr.parentElement;
                      } else {
                          break;
                      }
                  }
                  checks++;
             }

             if (refToggle) {
                 // console.log('Found reference toggle, clicking...');
                 refToggle.click();
                 await new Promise(resolve => setTimeout(resolve, 2000));
                 
                 // Strategy: Check Global Side Console after click
                 // Selector: .side-console-container .side-console .ref .sites a.site-item
                 const sideConsole = document.querySelector('.side-console-container');
                 if (sideConsole) {
                     const sideSites = sideConsole.querySelectorAll('.side-console .ref .sites a.site-item');
                     
                     if (sideSites.length > 0) {
                         return Array.from(sideSites).map((link, index) => {
                             const titleEl = link.querySelector('.site-title') || link.querySelector('.title');
                             const sourceEl = link.querySelector('.site-name') || link.querySelector('.header .name');
                             
                             return {
                                 id: `ref-${index + 1}`,
                                 title: titleEl ? titleEl.innerText : (link.innerText || 'Reference'),
                                 url: link.href,
                                 snippet: '', 
                                 source: sourceEl ? sourceEl.innerText : '',
                                 position: index + 1
                             };
                         });
                     }
                 }
             }

             // 2. Fallback: Search in siblings (if already expanded or different layout)
             // Reset traversal
             currentEl = el;
             checks = 0;
             
             // Traverse up to 10 levels
             while (currentEl && checks < 10) {
                  if (currentEl.classList.contains('chat-content-item') || currentEl.classList.contains('chat-content-list')) {
                      break;
                  }
                  
                  let sibling = currentEl.nextElementSibling;
                  let siblingChecks = 0;
                  
                  while (sibling && siblingChecks < 10) {
                      const isReference = 
                          sibling.innerText.includes('Reference') || 
                          sibling.innerText.includes('引用') || 
                          sibling.querySelectorAll('a.site-item, a.site').length > 0 ||
                          sibling.classList.contains('okc-cards-container');
                          
                      if (isReference) {
                          const sites = sibling.querySelectorAll('a.site-item, a.site');
                          if (sites.length > 0) {
                              targetElements = [...targetElements, ...Array.from(sites)];
                              resultsFound = true;
                          }
                      }
                      
                      sibling = sibling.nextElementSibling;
                      siblingChecks++;
                  }
                  
                  if (resultsFound) break; 
                  currentEl = currentEl.parentElement;
                  checks++;
             }
             
             // 3. Fallback: Check inside element
             if (targetElements.length === 0) {
                  const internalSites = Array.from(el.querySelectorAll('a.site-item, a.site'));
                  if (internalSites.length > 0) {
                      targetElements = internalSites;
                  } else {
                      const allLinks = Array.from(el.querySelectorAll('a'));
                      targetElements = allLinks.filter(a => {
                         const href = a.getAttribute('href');
                         return href && !href.includes('moonshot.cn') && (href.startsWith('http') || href.startsWith('//'));
                      });
                  }
             }
 
             const refLinks = targetElements;
 
             // Map to citation format
             const textContent = el.innerText; // Context comes from the main text
             
             return refLinks.map((link, index) => {
                 const titleEl = link.querySelector('.site-title') || link.querySelector('.title');
                 const sourceEl = link.querySelector('.site-name') || link.querySelector('.header .name');
                 return {
                     id: `ref-${index + 1}`,
                     title: titleEl ? titleEl.innerText : (link.innerText || 'Reference'),
                     url: link.href,
                     snippet: '',
                     source: sourceEl ? sourceEl.innerText : '',
                     position: index + 1
                 };
             });
        }, responseElement);
    } catch (error) {
        console.error('Error extracting references:', error);
        return [];
    }
  }

  async waitForGenerationToComplete(selector) {
      console.log('Waiting for generation to complete...');
      
      let lastText = '';
      let stableCount = 0;
      const maxRetries = 600; // 5 minutes max
      const stabilityThreshold = 30; // 15 seconds stable
      
      for (let i = 0; i < maxRetries; i++) {
          // 1. Check for "Stop" button (indication of active generation)
          // Kimi uses various classes/labels for stop button. 
          // Note: Specific selectors might need adjustment if Kimi changes UI.
          const stopBtn = await this.page.$('div[class*="stop"], button[class*="stop"], [aria-label="Stop"], [aria-label="停止生成"]');
          const isGenerating = stopBtn && await stopBtn.isVisible();

          if (isGenerating) {
              // If explicitly generating, reset stable count
              stableCount = 0; 
              
              // Update lastText to match current state so we don't treat the stop-moment as a change if text didn't change
              const elements = await this.page.$$(selector);
              if (elements.length > 0) {
                  lastText = await elements[elements.length - 1].textContent();
              }
              
              await this.page.waitForTimeout(500);
              continue;
          }

          // 2. Check text stability
          const elements = await this.page.$$(selector);
          if (elements.length === 0) {
              await this.page.waitForTimeout(500);
              continue;
          }
          
          const lastElement = elements[elements.length - 1];
          const currentText = await lastElement.textContent();
          
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

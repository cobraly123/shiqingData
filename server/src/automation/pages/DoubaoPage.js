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

    // Wait for the response to start generating
    try {
        await this.page.waitForSelector(selectors.response, { timeout: 15000 });
        console.log('Response generation started.');
    } catch (e) {
        console.log('Timeout waiting for response to start.');
    }

  }

  async waitForResponse(timeout = 300000) {
    console.log(`Doubao: Waiting for response (timeout: ${timeout}ms)...`);
    const selectors = this.modelConfig.selectors;

    // 1. Wait for "Stop" button to appear (indicating generation started)
    try {
        const stopButton = await this.page.waitForSelector('button[data-testid="stop_generating"]', { timeout: 15000 });
        if (stopButton) {
            console.log('Generation in progress (Stop button detected)...');
            // 2. Wait for "Stop" button to disappear (indicating generation finished)
            await this.page.waitForSelector('button[data-testid="stop_generating"]', { state: 'hidden', timeout: timeout }); 
            console.log('Generation completed (Stop button disappeared).');
        }
    } catch (e) {
        // Stop button might not have appeared if generation was very fast or selectors changed
        console.log('Stop button detection skipped or timed out. Checking response selector...');
        try {
             await this.page.waitForSelector(selectors.response, { timeout: 30000 });
        } catch(e2) {
             console.error('Doubao: Response selector not found');
             return null;
        }
    }
    
    // Extra stability wait
    await this.page.waitForTimeout(2000);

    // Double check with content stability
    await this.waitForGenerationToComplete(selectors.response);
    
    return await this.extractResponse();
  }

  async waitForGenerationToComplete(selector) {
      console.log('Doubao: Waiting for content stability...');
      let lastText = '';
      let stableCount = 0;
      const checkInterval = 1000;
      const stabilityThreshold = 5; // 5 checks * 1s = 5 seconds of stability required
      const maxChecks = 120; // 2 minutes max wait for stability

      for (let i = 0; i < maxChecks; i++) {
          try {
              const responses = await this.page.$$(selector);
              if (responses.length === 0) {
                  await this.page.waitForTimeout(checkInterval);
                  continue;
              }
              
              const lastResponse = responses[responses.length - 1];
              const text = await lastResponse.innerText();
              
              if (text.length > 0 && text === lastText) {
                  stableCount++;
                  if (stableCount >= stabilityThreshold) {
                      console.log(`Doubao: Content stable for ${stabilityThreshold}s. Generation assumed complete.`);
                      return;
                  }
              } else {
                  stableCount = 0;
                  lastText = text;
                  // console.log(`Doubao: Content changing... (${text.length} chars)`);
              }
          } catch (e) {
              console.warn('Error checking content stability:', e.message);
          }
          
          await this.page.waitForTimeout(checkInterval);
      }
      console.warn('Doubao: Timeout waiting for content stability.');
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
            
            // Try to expand "Search Sources" if collapsed
            // Strategy 1: Look for "搜索来源" text (Old UI)
            try {
                const sourceToggle = this.page.locator('text="搜索来源"').last();
                if (await sourceToggle.isVisible()) {
                    console.log('Found "搜索来源", clicking to expand...');
                    await sourceToggle.click();
                    await this.page.waitForTimeout(1000);
                }
            } catch (e) {}

            // Strategy 2: Look for "参考X篇文章" (New UI)
             try {
                  // Check if side panel is already open
                  const isSidePanelOpen = await this.page.evaluate(() => {
                      const panel = document.querySelector('div[data-testid="canvas_panel_container"]');
                      return panel && panel.getAttribute('data-visible') === 'true';
                  });

                  if (!isSidePanelOpen) {
                      // Look for elements containing "参考" and "篇" - Flexible Regex
                      // Matches "参考5篇", "参考 5 篇文章", "参考10+篇" etc.
                      const refToggles = await this.page.getByText(/参考\s*\d+.*篇/).all();
                      console.log(`Found ${refToggles.length} potential reference toggles.`);
                      
                      if (refToggles.length > 0) {
                          const lastRefToggle = refToggles[refToggles.length - 1];
                          if (await lastRefToggle.isVisible()) {
                              console.log('Found "参考X篇文章" toggle, clicking...');
                              await lastRefToggle.click();
                              // Wait for side panel to open
                              await this.page.waitForTimeout(2000); 
                          }
                      } else {
                          // Fallback: Check for any button with "参考"
                          const allRefButtons = await this.page.getByRole('button', { name: /参考/ }).all();
                          if (allRefButtons.length > 0) {
                              console.log('Found generic "参考" button, clicking last one...');
                              await allRefButtons[allRefButtons.length - 1].click();
                              await this.page.waitForTimeout(2000);
                          }
                      }
                  } else {
                      // console.log('Side panel is already open, skipping toggle click.');
                  }
             } catch (e) {
                 console.log('Error trying to expand references:', e.message);
             }

            const searchResults = await this.extractSearchResults(lastResponse);
            let references = await this.extractReferences(lastResponse);
            
            // Strict Mode: Do not fallback to search results. 
            // User requirement: "Get reference list from side bar".
            if (searchResults.length > 0 && (!references || references.length === 0)) {
                 console.log('Doubao: No references found in side panel. (Strict mode: Skipping fallback to search results)');
            }

            // Format data as requested: 序号、信源域名、信源文章名、信源URL
            const formatSource = (item) => ({
                '序号': item.index || item.position,
                '信源域名': item.source || item.domain || 'N/A',
                '信源文章名': item.title || 'N/A',
                '信源URL': item.url || ''
            });

            const formattedSearchResults = searchResults.map(formatSource);
            const formattedReferences = references.map(formatSource);

            const rawHtml = await lastResponse.innerHTML();
            
            return {
                text,
                searchResults,
                references,
                formattedSearchResults,
                formattedReferences,
                // Legacy support
                sources: searchResults,
                rawHtml
            };
        }
        return null;
    } catch (e) {
        console.error('Failed to extract response:', e);
        return null;
    }
  }

  async extractSearchResults(responseElement) {
    console.log('Doubao: Extracting search results...');
    try {
        return await this.page.evaluate(async (el) => {
            const results = [];
            const cleanUrl = (u) => {
                if (!u) return '';
                if (u.startsWith('//')) return 'https:' + u;
                return u;
            };

            // Doubao Search Sources Strategy
            // 1. Look for "搜索来源" or "参考" in parent containers
            
            let wrapper = el;
            let depth = 0;
            // Traverse up to find the message bubble wrapper
            while (wrapper && depth < 4) {
                if (wrapper.parentElement) {
                     const siblings = Array.from(wrapper.parentElement.children);
                     for (const sib of siblings) {
                         if (sib.innerText && (sib.innerText.includes('搜索来源') || sib.innerText.includes('参考'))) {
                             // This sibling is likely the source container
                             const links = sib.querySelectorAll('a');
                             links.forEach((link, i) => {
                                 const href = link.getAttribute('href');
                                 if (href && (href.startsWith('http') || href.startsWith('//'))) {
                                     results.push({
                                         title: link.innerText || 'No Title',
                                         url: cleanUrl(href),
                                         source: 'Doubao Search',
                                         position: i + 1
                                     });
                                 }
                             });
                         }
                     }
                }
                wrapper = wrapper.parentElement;
                depth++;
            }
            
            // 2. Also check if sources are inside the element itself (sometimes embedded)
            if (results.length === 0) {
                const embeddedLinks = el.querySelectorAll('a[class*="source"], a[class*="citation"]');
                embeddedLinks.forEach((link, i) => {
                    const href = link.getAttribute('href');
                    if (href && (href.startsWith('http') || href.startsWith('//'))) {
                        results.push({
                            title: link.innerText || 'No Title',
                            url: cleanUrl(href),
                            source: 'Doubao Embedded',
                            position: i + 1
                        });
                    }
                });
            }
            
            // Remove duplicates
            const uniqueResults = [];
            const seenUrls = new Set();
            for (const r of results) {
                if (!seenUrls.has(r.url)) {
                    seenUrls.add(r.url);
                    uniqueResults.push(r);
                }
            }
                
            // Global Fallback
            if (uniqueResults.length === 0) {
                 const allDivs = Array.from(document.querySelectorAll('div'));
                 const refDiv = allDivs.find(d => {
                    const style = window.getComputedStyle(d);
                    return style.display !== 'none' && 
                           d.innerText.includes('搜索来源') && 
                           d.querySelectorAll('a').length > 0 &&
                           (d.className.includes('panel') || d.className.includes('side'));
                 });
                 if (refDiv) {
                    const links = refDiv.querySelectorAll('a');
                    links.forEach((link, i) => {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('http') && !seenUrls.has(cleanUrl(href))) {
                            seenUrls.add(cleanUrl(href));
                            uniqueResults.push({
                                title: link.innerText || 'No Title',
                                url: cleanUrl(href),
                                source: 'Doubao Global',
                                position: uniqueResults.length + 1
                            });
                        }
                    });
                 }
            }

            return uniqueResults;
        }, responseElement);
    } catch (e) {
        console.warn('Error extracting Doubao search results:', e);
        return [];
    }
  }

  extractDomain(url) {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
        return '';
    }
  }

  async extractReferences(responseElement) {
    console.log('Doubao: Extracting references...');
    try {
        const rawRefs = await this.page.evaluate(async (el) => {
             const refs = [];
             const cleanUrl = (u) => {
                if (!u) return '';
                if (u.startsWith('//')) return 'https:' + u;
                return u;
            };

             // Strategy 1: Side Panel (Global search)
             // Look for the side panel container
             const sidePanels = Array.from(document.querySelectorAll(
                 'aside[data-testid="samantha_layout_right_side"], ' + 
                 'div[data-testid="canvas_panel_container"], ' +
                 'div[class*="side"], div[class*="panel"], div[class*="drawer"]'
             ));
             
             // Filter for panels that look like reference lists
             const refPanel = sidePanels.find(p => {
                 const style = window.getComputedStyle(p);
                 if (style.display === 'none' || style.visibility === 'hidden') return false;

                 const text = p.innerText || '';
                 const hasKeywords = text.includes('参考') || text.includes('来源');
                 const hasLinks = p.querySelectorAll('a').length > 0;
                 return hasKeywords && hasLinks;
             });

             const panelRefs = [];

             if (refPanel) {
                 // Strategy A: Precise extraction using data-testid="search-text-item"
                 const searchItems = refPanel.querySelectorAll('div[data-testid="search-text-item"]');
                 
                 if (searchItems.length > 0) {
                     searchItems.forEach((item, i) => {
                         const link = item.querySelector('a');
                         if (link) {
                             const href = link.getAttribute('href');
                             // Try to find title specifically
                             const titleEl = item.querySelector('div[class*="title"], .search-item-title');
                             const title = titleEl ? titleEl.innerText : link.innerText;
                             
                             // Try to find source name
                             // Usually in a span or div with class containing 'source' or next to favicon
                             let sourceName = '';
                             const sourceEl = item.querySelector('div[class*="source"], span[class*="source"], div[class*="site"], span[class*="site"]');
                             if (sourceEl) {
                                 sourceName = sourceEl.innerText.trim();
                             } else {
                                 // Fallback: Check for text nodes that are not title
                                 // This is tricky, maybe better handled in post-processing via domain
                             }

                             if (href && (href.startsWith('http') || href.startsWith('//'))) {
                                 panelRefs.push({
                                     title: title.replace(/\n/g, ' ').trim(),
                                     url: cleanUrl(href),
                                     source: sourceName, // Source name if found
                                     index: panelRefs.length + 1
                                 });
                             }
                         }
                     });
                 }
                 
                 // Strategy B: Fallback to all links if Strategy A failed
                 if (panelRefs.length === 0) {
                     const links = refPanel.querySelectorAll('a');
                     links.forEach((link, i) => {
                         const href = link.getAttribute('href');
                         const title = link.innerText;
                         // Filter out internal Doubao links or very short titles
                         if (href && (href.startsWith('http') || href.startsWith('//')) && 
                             !href.includes('doubao.com') && 
                             title.length > 5) {
                             
                             panelRefs.push({
                                 title: title.replace(/\n/g, ' ').trim(),
                                 url: cleanUrl(href),
                                 source: '', 
                                 index: panelRefs.length + 1
                             });
                         }
                     });
                 }
             }

             // Strategy 3: Global search for search-text-item (if panel detection failed)
             if (panelRefs.length === 0) {
                 const globalSearchItems = document.querySelectorAll('div[data-testid="search-text-item"]');
                 
                 if (globalSearchItems.length > 0) {
                      globalSearchItems.forEach((item, i) => {
                         const link = item.querySelector('a');
                         if (link) {
                             const href = link.getAttribute('href');
                             const titleEl = item.querySelector('div[class*="title"], .search-item-title');
                             const title = titleEl ? titleEl.innerText : link.innerText;
                             
                             let sourceName = '';
                             const sourceEl = item.querySelector('div[class*="source"], span[class*="source"]');
                             if (sourceEl) sourceName = sourceEl.innerText.trim();

                             if (href && (href.startsWith('http') || href.startsWith('//'))) {
                                 panelRefs.push({
                                     title: title.replace(/\n/g, ' ').trim(),
                                     url: cleanUrl(href),
                                     source: sourceName,
                                     index: panelRefs.length + 1
                                 });
                             }
                         }
                     });
                 }
             }
             
             return panelRefs;
        }, responseElement);

        // Post-processing to standardize format
        return rawRefs.map(ref => ({
            index: ref.index,
            domain: ref.source || this.extractDomain(ref.url), // Use source name if available, else hostname
            title: ref.title,
            url: ref.url
        }));

    } catch (e) {
        console.error('Error extracting Doubao references:', e);
        return [];
    }
  }

  // Deprecated
  async extractSources(responseElement) {
    return this.extractSearchResults(responseElement);
  }
}

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

  async sendQuery(query) {
    // Ensure Search is enabled before sending query
    await this.enableSearch();
    await super.sendQuery(query);
  }

  async enableSearch() {
    console.log('Deepseek: Checking "联网搜索" status...');
    try {
        // Wait a bit for UI to settle
        await this.page.waitForTimeout(1000);
        
        // Strategy: Look for the button by text "联网搜索"
        // It is usually a button or div with role button
        const searchBtns = await this.page.locator('div[role="button"], button').filter({ hasText: '联网搜索' }).all();
        
        if (searchBtns.length > 0) {
            // Pick the last one as sometimes there are hidden ones or top bar ones? 
            // Usually near input is what we want.
            // Let's filter by visibility first.
            let targetBtn = null;
            for (const btn of searchBtns) {
                if (await btn.isVisible()) {
                    targetBtn = btn;
                    break;
                }
            }

            if (targetBtn) {
                // Check if it is active. 
                // Deepseek active buttons often have a specific class (e.g., ds-button--active) or color.
                const className = await targetBtn.getAttribute('class');
                const ariaPressed = await targetBtn.getAttribute('aria-pressed');
                const style = await targetBtn.getAttribute('style');
                
                console.log(`Deepseek Search Button found. Class: ${className}`);
                
                // Heuristic: Check for "active" class or specific color
                // If we can't be sure, we might assume it's OFF by default for a new session and click it.
                // However, let's try to be smart.
                // If the class list contains 'active' or 'selected', it's on.
                
                const isActive = (className && (className.includes('active') || className.includes('selected'))) || 
                                 (ariaPressed === 'true');
                
                if (!isActive) {
                    console.log('Button seems inactive. Clicking to enable "联网搜索"...');
                    await targetBtn.click();
                    await this.page.waitForTimeout(1000);
                } else {
                    console.log('Button seems already active.');
                }
            } else {
                console.log('"联网搜索" button found but not visible.');
            }
        } else {
            console.log('"联网搜索" button not found via text. Trying generic search icon...');
            // Fallback logic could go here
        }
    } catch (e) {
        console.error('Error enabling search:', e);
    }
  }

  async extractResponse() {
    const selectors = this.modelConfig.selectors;
    
    // Wait for the response to start generating
    await this.page.waitForSelector(selectors.response, { timeout: 10000 });
    
    // Smart Wait using waitForResponse logic (DeepSeek specific stability check)
    // Actually, waitForResponse returns the full result object, so we might just want to use that if we are calling this as a standalone method.
    // However, usually extractResponse is called AFTER we have waited.
    // But since DeepSeekPage.waitForResponse handles the wait AND extraction, we should probably just align them.
    
    // If we assume this is called after generation is done (or we want it to wait):
    // Let's implement the extraction logic on the *current* state of the page.
    
    const responses = await this.page.$$(selectors.response);
    const lastResponse = responses[responses.length - 1];
    
    // Extract Text using the robust method from waitForResponse
    const text = await lastResponse.evaluate(el => {
        function getText(node) {
            if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
            if (node.nodeType !== Node.ELEMENT_NODE) return '';
            let text = '';
            const style = window.getComputedStyle(node);
            const isBlock = style.display === 'block' || style.display === 'flex' || style.display === 'grid' || node.tagName === 'P' || node.tagName === 'DIV' || node.tagName === 'BR';
            if (node.tagName === 'BR') return '\n';
            for (const child of node.childNodes) text += getText(child);
            if (isBlock && !text.endsWith('\n')) text += '\n';
            return text;
        }
        return getText(el);
    });

    // Extract Search Results and References
    const searchResults = await this.extractSearchResults(lastResponse);
    let references = await this.extractReferences(lastResponse);

    // [User Request] Copy search results to references if references are missing
    if (searchResults.length > 0 && (!references || references.length === 0)) {
        console.log('Deepseek: Copying search results to references as requested.');
        references = [...searchResults];
    }

    return {
        text: text,
        searchResults: searchResults,
        references: references,
        // Legacy support
        sources: searchResults,
        rawHtml: await lastResponse.innerHTML()
    };
  }

  async extractSearchResults(responseElement) {
    console.log('Deepseek: Extracting search results...');
    try {
        return await this.page.evaluate(async (el) => {
            const results = [];
            const cleanUrl = (u) => {
                if (!u) return '';
                if (u.startsWith('//')) return 'https:' + u;
                return u;
            };

            const addSource = (title, url, source) => {
                if (url && url.startsWith('http') && !results.find(s => s.url === url)) {
                    // Clean title
                    let cleanTitle = title.replace(/^\[?\d+\]?\.?\s*/, '').trim();
                    if (!cleanTitle || cleanTitle === '-' || cleanTitle === '-\n') {
                        // Try to find a better title in child elements
                        // Sometimes the title is in a separate span
                        cleanTitle = title.split('\n').filter(t => t.trim().length > 2).join(' ');
                    }
                    if (!cleanTitle) cleanTitle = 'Reference';

                    results.push({ 
                        title: cleanTitle, 
                        url: url,
                        source: source || 'Deepseek Search',
                        position: results.length + 1
                    });
                }
            };

            // 1. Local Search (inside response element)
            // Deepseek sometimes embeds links directly or in a "Search" block
            const links = el.querySelectorAll('a');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('http')) {
                    // Check if this link is part of a citation/reference block
                    // Often they look like [1] or are in a list
                    addSource(link.innerText, cleanUrl(href), 'Deepseek Link');
                }
            });

            // 2. Global Fallback
            if (results.length === 0) {
                 const allDivs = Array.from(document.querySelectorAll('div'));
                 // Look for the "Search Results" or "References" container
                 // It often appears at the top or bottom of the answer
                 const refDiv = allDivs.find(d => {
                    const style = window.getComputedStyle(d);
                    const text = d.innerText;
                    return style.display !== 'none' && 
                           (text.includes('参考') || text.includes('Sources') || text.includes('搜索结果')) && 
                           d.querySelectorAll('a').length > 0 &&
                           // Heuristics to avoid selecting the whole page
                           d.innerText.length < 2000;
                 });
                 
                 if (refDiv) {
                    const links = refDiv.querySelectorAll('a');
                    links.forEach(link => {
                         // Specific logic for Deepseek's search result cards if they exist
                         // They might have a specific structure: Title \n Domain
                         let title = link.innerText;
                         const lines = title.split('\n').map(l => l.trim()).filter(l => l);
                         if (lines.length > 1) {
                             // Heuristic: If multiple lines, one is likely the title, one the domain
                             // Usually Title is first or longest
                             title = lines[0];
                         }
                         
                        addSource(title, cleanUrl(link.getAttribute('href')), 'Deepseek Global');
                    });
                 }
            }

            return results;
        }, responseElement);
    } catch (e) {
        console.error('Error extracting Deepseek search results:', e);
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

  // Deprecated: Consolidated into the main waitForResponse below
  // async waitForResponse(timeout = 120000) { ... }

  async openSidePanel() {
    console.log('Deepseek: openSidePanel called.');
    try {
        // 1. Try specific regex locator first
        const btnLocator = this.page.locator('span').filter({ hasText: /已阅读\s*\d+\s*个网页/ }).first();
        if (await btnLocator.isVisible()) {
             console.log('Deepseek: Found "X pages" button via regex. Clicking...');
             await btnLocator.click();
             await this.page.waitForTimeout(2000); // Wait for animation
             return true;
        }

        // 2. Fallback selectors
        const potentialSelectors = [
            'div[role="button"]:has-text("已阅读")',
            'div[role="button"]:has-text("Sources")',
            'div[role="button"]:has-text("参考")'
        ];
        
        for (const sel of potentialSelectors) {
            if (await this.page.isVisible(sel)) {
                console.log(`Deepseek: Found button via selector ${sel}. Clicking...`);
                await this.page.locator(sel).first().click();
                await this.page.waitForTimeout(2000);
                return true;
            }
        }
        
        console.log('Deepseek: Search toggle NOT visible.');
        return false;
    } catch (e) {
        console.error('Error opening side panel:', e);
        return false;
    }
  }

  async extractReferences(responseElement) {
    console.log('Deepseek: Extracting references...');
    try {
        // 1. Try to extract from side panel
        try {
            // Helper function to perform extraction
            const performExtraction = async () => {
                 return await this.page.evaluate(() => {
                    const results = [];
                    
                    // 1. Identify the Side Panel
                    const windowWidth = window.innerWidth;
                    const potentialPanels = Array.from(document.querySelectorAll('div')).filter(div => {
                         if (div.offsetParent === null) return false;
                         const rect = div.getBoundingClientRect();
                         // Must be on the right 40% of the screen
                         if (rect.left < windowWidth * 0.6) return false;
                         // Must have substantial size
                         if (rect.width < 200 || rect.height < 300) return false;
                         // Must contain links
                         if (div.querySelectorAll('a').length < 2) return false;
                         return true;
                    });
                    
                    let sidePanel = null;
                    if (potentialPanels.length > 0) {
                         // Pick the one with the most links
                         sidePanel = potentialPanels.sort((a, b) => b.querySelectorAll('a').length - a.querySelectorAll('a').length)[0];
                    }

                    if (!sidePanel) return [];

                    // 2. Extract Links from Side Panel
                    const allLinks = Array.from(sidePanel.querySelectorAll('a[target="_blank"]'));
                    
                    allLinks.forEach((link) => {
                        if (link.offsetParent === null) return;
                        
                        // Traverse up to find the "Card"
                        let card = link;
                        let foundCard = false;
                        for (let j=0; j<5; j++) {
                            if (card.parentElement && card.parentElement !== sidePanel) {
                                 if (card.innerText.length > 20) {
                                     foundCard = true;
                                     break;
                                 }
                                 card = card.parentElement;
                            } else {
                                break;
                            }
                        }
                        if (!foundCard) card = link.parentElement;

                        const rawText = card.innerText;
                    let lines = rawText.split('\n')
                        .map(l => l.trim())
                        .filter(l => l && l !== '搜索结果' && l !== 'Search Results');

                    if (lines.length >= 2) {
                        let sourceName = lines[0];
                        let title = '';
                        
                        // Robust Title Extraction: Skip metadata (Dates, Indices)
                        for (let k = 1; k < lines.length; k++) {
                            const line = lines[k];
                            // Check for Date (YYYY/MM/DD or YYYY-MM-DD)
                            const isDate = /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(line);
                            // Check for Index (Single integer)
                            const isIndex = /^\d+$/.test(line);
                            
                            if (!isDate && !isIndex) {
                                title = line;
                                break;
                            }
                        }

                        // Fallback: If no title found (e.g. only domain and metadata), use the last line
                        if (!title && lines.length > 1) {
                            title = lines[lines.length - 1];
                        }
                        
                        // Clean Source Name (remove date/time if attached)
                        sourceName = sourceName.split(/\s+\d{4}/)[0].trim();

                        if (!results.find(r => r.url === link.href)) {
                            results.push({
                                index: results.length + 1,
                                domain: sourceName,
                                title: title,
                                url: link.href
                            });
                        }
                    }
                    });
                    return results;
                });
            };

            // 1. Try initial extraction
            let sidePanelRefs = await performExtraction();

            // 2. If no references found, try to open the side panel
            if (sidePanelRefs.length === 0) {
                console.log('Deepseek: No references found initially. Attempting to open side panel...');
                const opened = await this.openSidePanel();
                if (opened) {
                    // Wait for animation/load
                    await this.page.waitForTimeout(2000); 
                    // Retry extraction
                    sidePanelRefs = await performExtraction();
                }
            }

            if (sidePanelRefs.length > 0) {
                console.log(`Deepseek: Extracted ${sidePanelRefs.length} references from side panel.`);
                return sidePanelRefs.sort((a, b) => a.index - b.index);
            }
        } catch (e) {
            console.error('Error extracting from side panel:', e);
        }


        // 2. Fallback to inline extraction
        const rawRefs = await this.page.evaluate(async (el) => {
             const refs = [];
             // ... (existing inline logic)
             // Strategy 1: Look for explicit reference list container
             const refContainers = Array.from(document.querySelectorAll('div')).filter(d => 
                d.innerText.includes('参考') || d.innerText.includes('Sources')
             );
             
             if (refContainers.length > 0) {
                 const container = refContainers[refContainers.length - 1]; 
                 const links = container.querySelectorAll('a');
                 
                 links.forEach((link, i) => {
                     refs.push({
                         index: i + 1,
                         title: link.innerText || link.textContent,
                         url: link.href,
                         source: '' 
                     });
                 });
             }
             
             // Strategy 2: Look for superscripts
             if (refs.length === 0) {
                 const markers = el.querySelectorAll('sup a, .citation-mark a');
                 markers.forEach((link, i) => {
                     refs.push({
                         index: i + 1,
                         title: link.title || link.innerText || `Source ${i+1}`,
                         url: link.href,
                         source: ''
                     });
                 });
             }
             return refs;
        }, responseElement);

        return rawRefs.map(ref => ({
            index: ref.index,
            domain: this.extractDomain(ref.url),
            title: ref.title,
            url: ref.url
        }));

    } catch (e) {
        console.error('Error extracting Deepseek references:', e);
        return [];
    }
  }

  // Deprecated
  async extractSources(responseElement) {
    return this.extractSearchResults(responseElement);
  }

  async waitForResponse(timeout = 180000) {
    console.log('Waiting for Deepseek response...');
    const selectors = this.modelConfig.selectors;
    
    let finalResponse = null;
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
            const currentText = await lastResponse.evaluate(el => el.innerText);
            
            if (currentText.length > 0 && currentText === lastText) {
                stableCount++;
            } else {
                stableCount = 0;
                lastText = currentText;
            }
            
            if (stableCount >= stabilityThreshold) {
                console.log('Response stable.');
                break;
            }
            
            await this.page.waitForTimeout(checkInterval);
        }

        // 3. Open Side Panel for References (New Logic)
        await this.openSidePanel();
        
        // 4. Extract Everything
        finalResponse = await this.extractResponse();

    } catch (e) {
        console.error('Error waiting for response:', e);
        // Try to recover whatever we have
        finalResponse = await this.extractResponse();
    }
    
    return finalResponse;
  }
}

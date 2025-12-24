import { BasePage } from './BasePage.js';

export class WenxinPage extends BasePage {
  constructor(page) {
    super(page, 'wenxin');
  }

  async navigate() {
    await super.navigate();
  }

  async isLoggedIn() {
    // Strong check: Look for User Avatar or specific logged-in elements
    const userAvatar = await this.page.$('div[class*="avatar"], img[alt*="头像"], .user-center');
    return userAvatar && await userAvatar.isVisible();
  }

  async handleLogin() {
    // Setup Network Listener
    // Wenxin uses /api/user or similar
    const authCheckPromise = this.checkLoginByNetwork(/api\/(user|chat)/, 10000);

    const result = await super.handleLogin(false);

    // Check Network
    try {
        const isNetworkAuth = await Promise.race([
            authCheckPromise,
            new Promise(r => setTimeout(() => r(false), 1000))
        ]);
        if (isNetworkAuth) {
             console.log('Login confirmed via Network!');
             return true;
        }
    } catch (e) {}

    if (result) return true;

    return await this.waitForManualLogin();
  }

  async waitForManualLogin() {
     // Wait for manual login (generic implementation)
     // We look for the chat input as a sign of successful login
     console.log('Waiting for user to complete login (timeout: 5 min)...');
     try {
         await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 300000, state: 'visible' });
         
         // Wenxin specific: Wait for login modal to disappear
         const loginModalSelector = '#passport-login-pop, .tang-pass-pop-login';
         console.log('Checking for login modal to disappear...');
         try {
             await this.page.waitForSelector(loginModalSelector, { state: 'hidden', timeout: 30000 });
             console.log('Login modal disappeared.');
         } catch (e) {
             console.warn('Login modal still present or could not determine state:', e.message);
         }

         console.log('Login detected! Chat input is visible and modal should be gone.');
         return true;
     } catch (e) {
         console.error('Timeout waiting for login to complete.');
         return false;
     }
  }

  async sendQuery(query) {
    console.log(`Sending query to Wenxin: ${query.substring(0, 50)}...`);
    const selectors = this.modelConfig.selectors;
    
    // Log current state
    console.log('Current URL:', this.page.url());
    
    // Ensure input is visible
    try {
        await this.page.waitForSelector(selectors.input, { state: 'visible', timeout: 10000 });
    } catch (e) {
        console.error('Input box not found. Check if logged in or selectors changed.');
        throw e;
    }

    // Check for blocking overlays before typing
    await this.checkAndClosePopups();
    const loginModal = await this.page.$('#passport-login-pop');
    if (loginModal && await loginModal.isVisible()) {
        console.log('Login modal detected before sending query. Waiting for it to close...');
        await loginModal.waitForElementState('hidden', { timeout: 10000 }).catch(() => console.log('Login modal did not close automatically.'));
    }

    // Focus and Type
    const input = await this.page.$(selectors.input);
    await input.click();
    await this.page.waitForTimeout(500); // Wait for focus
    
    // Clear existing content (if any)
    await this.page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) el.innerHTML = ''; 
    }, selectors.input);
    
    await this.page.keyboard.type(query, { delay: 10 }); 
    await this.page.waitForTimeout(1000);

    // Try pressing Enter first, it's often more reliable
    console.log('Pressing Enter to submit...');
    await this.page.keyboard.press('Enter');
    
    // Wait for potential navigation or reaction
    try {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 });
    } catch (e) {
        // Ignore timeout, meaning no navigation happened, which is fine for SPA
    }
    await this.page.waitForTimeout(2000);

    // Backup: Click submit if button exists and looks active
    try {
        const submitBtn = await this.page.$(selectors.submit);
        if (submitBtn && await submitBtn.isVisible()) {
            console.log('Clicking submit button as backup...');
            await submitBtn.click();
        }
    } catch (e) {
        console.log('Backup click skipped (context destroyed or other error):', e.message);
    }
     
     await this.page.waitForTimeout(3000);
     try {
        const bodyText = await this.page.innerText('body');
        // console.log('Page content after submit:', bodyText.substring(0, 200).replace(/\n/g, ' '));
     } catch (e) {
        console.log('Could not get page content:', e.message);
     }

     // Wait for response generation to start
     console.log('Waiting for response...');
   }

  async waitForResponse(timeout = 300000) {
    console.log(`Wenxin: Waiting for response (timeout: ${timeout}ms)...`);
    const selectors = this.modelConfig.selectors;
    
    try {
        // Wait for the response to start generating
        await this.page.waitForSelector(selectors.response, { timeout: 30000 });
    } catch(e) {
        console.error('Wenxin: Response selector not found within timeout');
        return null;
    }

    // Smart Wait: Wait for generation to complete
    await this.waitForGenerationToComplete(selectors.response);
    
    return await this.extractResponse();
  }

  async extractResponse() {
    const selectors = this.modelConfig.selectors;
    
    // Get the last response bubble
    const responses = await this.page.$$(selectors.response);
    if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        
        // Extract Text
        const text = await lastResponse.textContent();
        
        // Try to expand references (Wenxin specific)
        try {
            // Use a more robust locator for the "Reference" toggle
            // User report: "参考x篇文档"
            // Regex matches: "参考 10 个/篇 文档/网页" etc.
            const refToggle = this.page.locator('div, span, button')
                .filter({ hasText: /参考\s*\d+\s*[个篇]?(?:文档|网页|来源)/ })
                .last();
            
            if (await refToggle.count() > 0 && await refToggle.isVisible()) {
                console.log('Found reference toggle, clicking...');
                await refToggle.click();
                await this.page.waitForTimeout(5000); // Wait for side panel animation (increased to 5s)
            } else {
                console.log('Reference toggle not found or not visible.');
            }
        } catch (e) {
            console.log('Error expanding references:', e.message);
        }

        // Extract Search Results and References
        const searchResults = await this.extractSearchResults(lastResponse);
        
        // 1. Try to extract from side panel first (most reliable for Wenxin per user)
        let references = await this.extractSidePanelReferences();
        
        // Strict Mode: User requirement "Get reference list from side bar".
        // We do NOT fallback to inline citations or search results if side panel is empty.
        if (references.length === 0) {
             console.log('Wenxin: No references found in side panel.');
        }

        /* Legacy Fallbacks (Disabled for Strict Side Panel Mandate)
        // 2. Fallback to inline citations if side panel failed
        if (references.length === 0) {
             console.log('Side panel extraction failed or empty, falling back to inline citations...');
             references = await this.extractReferences(lastResponse);
        }

        // Wenxin specific: If references are empty but we found search results (which are likely the "Reference" list),
        // use search results as references. The toggle "Reference X pages" usually reveals these items.
        if ((!references || references.length === 0) && searchResults && searchResults.length > 0) {
            console.log('Wenxin: Using search results as references (since they are likely the same).');
            references = searchResults.map((item, index) => ({
                index: index + 1,
                domain: item.source || item.domain || this.extractDomain(item.url),
                title: item.title,
                url: item.url,
                source: item.source || 'Wenxin Reference' 
            }));
        }
        */
        
        // Ensure all references have the required fields
        references = references.map((ref, index) => ({
             index: index + 1,
             domain: ref.source || ref.domain || this.extractDomain(ref.url),
             title: ref.title,
             url: ref.url,
             source: ref.source || ref.domain || 'Wenxin Reference'
        }));
        
        // Enrich references from search results if possible (to get better titles or domains if missing)
        if (references.length > 0 && searchResults && searchResults.length > 0) {
            console.log('Wenxin: Enriching references with source info from search results...');
            references = references.map((ref, index) => {
                const correspondingResult = searchResults[index];
                if (correspondingResult) {
                    const bestSource = correspondingResult.source || ref.source;
                    return {
                        ...ref,
                        domain: bestSource || ref.domain || correspondingResult.domain || this.extractDomain(ref.url),
                        source: bestSource || ref.source,
                        title: ref.title === `Ref ${index+1}` ? correspondingResult.title : ref.title
                    };
                }
                return ref;
            });
        }

        // Format data as requested: 序号、信源域名、信源文章名、信源URL
        const formatSource = (item) => ({
            '序号': item.index || item.position || item.number,
            '信源域名': item.domain || item.source || 'N/A',
            '信源文章名': item.title || 'N/A',
            '信源URL': item.url || ''
        });

        const formattedSearchResults = searchResults.map(formatSource);
        const formattedReferences = references.map(formatSource);

        // Return structured result
        return {
            text: text,
            searchResults: searchResults,
            references: references,
            formattedSearchResults,
            formattedReferences,
            // Legacy support
            sources: searchResults, 
            rawHtml: await lastResponse.innerHTML()
        };
    }
    return null;
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

  async extractSidePanelReferences() {
    console.log('Wenxin: Extracting references from side panel...');
    try {
        return await this.page.evaluate(() => {
            // Helper to clean URL
            const cleanUrl = (u) => {
                if (!u) return '';
                if (u.startsWith('//')) return 'https:' + u;
                return u;
            };

            const extractDomain = (u) => {
                if (!u) return '';
                try {
                    const urlObj = new URL(u);
                    return urlObj.hostname.replace(/^www\./, '');
                } catch (e) { return ''; }
            };

            // Look for side panel container
            // We reuse logic from extractSearchResults but focus on finding *the* panel that opened
            // The side panel usually has a high z-index or specific positioning on the right
            const allDivs = Array.from(document.querySelectorAll('div, aside, section'));
            const sidePanel = allDivs.find(d => {
                 const style = window.getComputedStyle(d);
                 const rect = d.getBoundingClientRect();
                 const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 200;
                 const isRightSide = rect.left > (window.innerWidth * 0.6); 
                 // Look for specific headers in the panel
                 const hasHeader = d.innerText.includes('参考') || d.innerText.includes('引用') || d.innerText.includes('来源');
                 // Wenxin side panel might NOT have <a> tags, so we don't check for links here anymore
                 // const hasLinks = d.querySelectorAll('a').length > 0;
                 return isVisible && isRightSide && hasHeader;
            });

            if (!sidePanel) return [];

            // Try to find items within the side panel
            // Wenxin uses obfuscated classes like item__LANBI_7b
            let items = Array.from(sidePanel.querySelectorAll('div[class*="item__"]'));
            
            // Fallback: if no specific items found, look for <a> tags (legacy behavior)
            if (items.length === 0) {
                 const links = sidePanel.querySelectorAll('a');
                 if (links.length > 0) {
                     return Array.from(links).map((link, i) => {
                        let title = link.innerText || link.getAttribute('title') || link.textContent || 'No Title';
                        title = title.trim().replace(/\n/g, ' ');
                        const href = link.getAttribute('href');
                        if (!href || !href.startsWith('http')) return null;
                        const url = cleanUrl(href);
                        const domain = extractDomain(url);
                        return {
                            index: i + 1,
                            domain: domain,
                            title: title,
                            url: url,
                            source: domain
                        };
                     }).filter(l => l !== null);
                 }
                 return [];
            }

            // Process specific items
            return items.map((item, i) => {
                const titleEl = item.querySelector('[class*="titleInfo"]');
                const siteEl = item.querySelector('[class*="siteText"]');
                const iconEl = item.querySelector('img[class*="site_icon"]');
                
                let title = titleEl ? titleEl.innerText : 'No Title';
                let sourceName = siteEl ? siteEl.innerText : 'Wenxin Reference';
                
                // Try to find URL
                let url = '';
                const link = item.querySelector('a');
                if (link && link.href) url = link.href;
                if (!url) url = item.getAttribute('data-url') || item.getAttribute('url') || '';
                
                // Try to find domain
                let domain = '';
                if (url) {
                    domain = extractDomain(url);
                }
                
                // If domain missing, try to get from favicon src
                if (!domain && iconEl && iconEl.src) {
                    domain = extractDomain(iconEl.src);
                }

                return {
                    index: i + 1,
                    domain: sourceName || domain, // Use source name as domain if available
                    title: title.trim().replace(/\n/g, ' '),
                    url: url || 'URL Hidden (Click to Open)',
                    source: sourceName || domain
                };
            }).filter(item => item !== null);
        });
    } catch (e) {
        console.error('Error extracting Wenxin side panel references:', e);
        return [];
    }
  }

  async extractSearchResults(responseElement) {
    console.log('Wenxin: Extracting search results...');
    try {
        return await this.page.evaluate(async (el) => {
            const results = [];
            const cleanUrl = (u) => {
                if (!u) return '';
                if (u.startsWith('//')) return 'https:' + u;
                return u;
            };
            const extractDomain = (u) => {
                if (!u) return '';
                try {
                    const urlObj = new URL(u);
                    return urlObj.hostname.replace(/^www\./, '');
                } catch (e) { return ''; }
            };

            // Helper to parse links from a container
            const parseLinks = (container) => {
                const links = container.querySelectorAll('a');
                return Array.from(links).map((link, i) => {
                    const title = link.innerText || link.getAttribute('title') || link.textContent || 'No Title';
                    const href = link.getAttribute('href');
                    if (!href || !href.startsWith('http')) return null;
                    
                    const url = cleanUrl(href);
                    return {
                        title: title.trim().replace(/\n/g, ' '),
                        url: url,
                        domain: extractDomain(url),
                        source: 'Wenxin Search',
                        position: i + 1
                    };
                }).filter(l => l !== null);
            };

            // Strategy 1: Global Side Panel (Right side of screen)
            // We look for a visible container on the right side that contains "参考" or "来源"
            const allDivs = Array.from(document.querySelectorAll('div, aside, section'));
            
            // Debug: Log potential candidates
            const candidates = allDivs.filter(d => {
                 const style = window.getComputedStyle(d);
                 const rect = d.getBoundingClientRect();
                 const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.width > 100 && rect.height > 100;
                 const isRightSide = rect.left > (window.innerWidth * 0.55); // Strictly right side
                 return isVisible && isRightSide;
            });
            // console.log(`Found ${candidates.length} candidates on the right side.`);

            const sidePanel = candidates.find(d => {
                const hasKeywords = d.innerText.includes('参考') || d.innerText.includes('来源') || d.innerText.includes('搜索');
                const hasLinks = d.querySelectorAll('a').length > 0;
                // console.log(`Candidate: ${d.className} | Text: ${d.innerText.substring(0, 30)}... | Links: ${d.querySelectorAll('a').length}`);
                return hasKeywords && hasLinks;
            });

            if (sidePanel) {
                // console.log('Found side panel:', sidePanel.className);
                return parseLinks(sidePanel);
            }

            // Strategy 2: Look for specific known classes (fallback)
            const specificPanel = document.querySelector('.side-panel, [class*="reference-panel"], .ec-result-panel, [class*="source-list"]');
            if (specificPanel) {
                return parseLinks(specificPanel);
            }
            
            // Strategy 4: Wenxin Specific Obfuscated DOM (Class names with hashes)
            // Look for divs with class containing 'item__' and 'titleInfo__'
            const specificItems = Array.from(document.querySelectorAll('div[class*="item__"]'));
            if (specificItems.length > 0) {
                 // console.log(`Found ${specificItems.length} specific items (obfuscated DOM).`);
                 const extracted = specificItems.map((item, i) => {
                     const titleEl = item.querySelector('[class*="titleInfo__"]');
                     const siteEl = item.querySelector('[class*="siteText__"]');
                     const abstractEl = item.querySelector('[class*="wildAbstract__"]');
                     
                     // Try to find URL
                     let url = '';
                     const link = item.querySelector('a');
                     if (link && link.href) url = link.href;
                     
                     // If no link, check dataset or attributes
                     if (!url) {
                         // Check common data attributes
                         url = item.getAttribute('data-url') || item.getAttribute('url') || '';
                         
                         // Try to find any property that looks like a URL in dataset
                         if (!url && item.dataset) {
                             for (const key in item.dataset) {
                                 if (item.dataset[key] && typeof item.dataset[key] === 'string' && item.dataset[key].startsWith('http')) {
                                     url = item.dataset[key];
                                     break;
                                 }
                             }
                         }
                     }

                     if (titleEl) {
                         return {
                             title: titleEl.innerText,
                              url: url || 'URL Hidden (Click to Open)',
                              source: siteEl ? siteEl.innerText : 'Wenxin Search',
                              abstract: abstractEl ? abstractEl.innerText : '',
                              number: i + 1
                          };
                      }
                      return null;
                  }).filter(r => r !== null);
                  
                  if (extracted.length > 0) return extracted;
             }

            // Strategy 5: Heuristic - Find ANY container with multiple external links on the right
            // This is a catch-all for when keywords are missing or different
            const linkCluster = candidates.find(d => {
                const links = d.querySelectorAll('a');
                let validLinks = 0;
                for(const l of links) {
                    if (l.href && l.href.startsWith('http') && l.innerText.length > 5) validLinks++;
                }
                return validLinks >= 2;
            });
            
            if (linkCluster) {
                // console.log('Found link cluster on right side:', linkCluster.className);
                return parseLinks(linkCluster);
            }


            // Strategy 3: Inline container (above/below response) - Legacy fallback
            // ... (keep existing logic if needed, or simplify)
            
            return [];
        }, responseElement);
    } catch (e) {
        console.error('Error extracting Wenxin search results:', e);
        return [];
    }
  }

  async extractReferences(responseElement) {
    console.log('Wenxin: Extracting references...');
    try {
        return await this.page.evaluate(async (el) => {
            const refs = [];
            // Wenxin citations are usually [1], [2] in the text, linking to the sources.
            // We can extract them by looking for sup tags or specific classes.
            
            const supTags = el.querySelectorAll('sup, .citation, .reference-mark');
            supTags.forEach((tag, i) => {
                const link = tag.querySelector('a') || tag.closest('a');
                if (link) {
                    refs.push({
                        id: `ref-${i+1}`,
                        title: tag.innerText || `Ref ${i+1}`,
                        url: link.href,
                        position: i + 1
                    });
                }
            });
            
            return refs;
        }, responseElement);
    } catch (e) {
        console.error('Error extracting Wenxin references:', e);
        return [];
    }
  }

  // Deprecated but kept for compatibility if needed internally
  async extractSources(responseElement) {
      return this.extractSearchResults(responseElement);
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
        let lastResponseLoc = null;
        let lastText = '';
        try {
            const responseLocs = this.page.locator(responseSelector);
            const count = await responseLocs.count();
            if (count > 0) {
                lastResponseLoc = responseLocs.nth(count - 1);
                lastText = (await lastResponseLoc.textContent()) || '';
            }
        } catch {}
        
        if (lastResponseLoc && /已停止生成/.test(lastText || '')) {
            let clicked = false;
            const candidates = [
                lastResponseLoc.locator('button:has-text("重新生成")').first(),
                lastResponseLoc.locator('[role="button"]:has-text("重新生成")').first(),
                lastResponseLoc.locator('div[class*="retryBtn"]').first(),
                lastResponseLoc.locator('div[class*="refresh"]').first(),
                lastResponseLoc.locator('svg').first()
            ];
            for (const b of candidates) {
                try {
                    if (await b.isVisible()) { await b.click(); clicked = true; break; }
                } catch {}
            }
            if (clicked) {
                lastChangeTime = Date.now();
                await this.page.waitForTimeout(2000);
                continue;
            }
        }
        
        try {
            const stoppedIndicator = await this.page.locator('text=/已停止生成|生成失败|请重试|网络异常|重试/').first();
            let indicatorVisible = false;
            try { indicatorVisible = await stoppedIndicator.isVisible(); } catch {}
            if (indicatorVisible) {
                let clicked = false;
                const container = stoppedIndicator.locator('xpath=ancestor::*[1]');
                const candidates = [
                    container.locator('button:has-text("重新生成")').first(),
                    container.locator('[role="button"]:has-text("重新生成")').first(),
                    container.locator('div[class*="retryBtn"]').first(),
                    container.locator('div[class*="refresh"]').first(),
                    container.locator('svg').first()
                ];
                for (const b of candidates) {
                    try {
                        if (await b.isVisible()) { await b.click(); clicked = true; break; }
                    } catch {}
                }
                if (!clicked) {
                    try {
                        const box = await stoppedIndicator.boundingBox();
                        if (box) {
                            await this.page.mouse.click(box.x + box.width + 8, box.y + box.height / 2);
                            clicked = true;
                        }
                    } catch {}
                }
                if (clicked) {
                    lastChangeTime = Date.now();
                    await this.page.waitForTimeout(1500);
                    continue;
                }
            }
        } catch {}

        // Check 0b: Specific Retry Button (User provided case)
        // Path: div.retryBtn__... (e.g. retryBtn__dh4pWh5C)
        // This button often appears when generation stops without a clear text indicator, or as a standalone icon.
        try {
            const retryBtn = await this.page.locator('div[class*="retryBtn"]').first();
            if (await retryBtn.isVisible()) {
                console.log('Wenxin: Detected specific "retryBtn". Clicking to resume...');
                await retryBtn.click();
                
                // Reset stability timers
                lastChangeTime = Date.now();
                await this.page.waitForTimeout(2000); 
                continue; 
            }
        } catch (e) {}

        // Check 1: Is "Regenerate" button visible?
        // Note: Selector might need adjustment based on exact UI
        const regenerateBtn = await this.page.$(this.modelConfig.selectors.regenerate || 'div[class*="regenerate"], div[class*="refresh"], span:has-text("重新生成")');
        if (regenerateBtn && await regenerateBtn.isVisible()) {
            console.log('Generation complete (Regenerate button detected).');
            return;
        }

        // Check 2: Content stability
        if (lastResponseLoc) {
            const currentLength = (lastText || '').length;
            
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

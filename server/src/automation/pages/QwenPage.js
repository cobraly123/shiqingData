import { BasePage } from './BasePage.js';

export class QwenPage extends BasePage {
  constructor(page) {
    super(page, 'qwen');
  }

  async navigate() {
    await super.navigate();
  }

  async isLoggedIn() {
      // Strategy 1: Check for Login button (Fastest fail)
      const loginBtn = await this.page.$('text="登录"');
      if (loginBtn && await loginBtn.isVisible()) {
          console.log('Login button detected. Not logged in.');
          return false;
      }

      // Strategy 2: Network Check (Most Reliable)
      // Check for Qwen's user info or session API
      // Common Qwen APIs: /api/v1/user/info, /api/v1/chat/history, or similar
      // We perform a quick check if we can catch a relevant network request
      // NOTE: This is best used during page load. If page is static, we might miss it.
      // So we combine it with UI check.
      
      // Strategy 3: UI Check (Fallback)
      if (await this.page.isVisible(this.modelConfig.selectors.input)) {
          return true; 
      }
      
      return false;
  }

  async handleLogin() {
      // Special handling for Qwen's dual domain requirement
      if (await this.isLoggedIn()) {
          console.log('Already logged in.');
          return true;
      }

      if (this.modelConfig.auth && this.modelConfig.auth.cookies) {
          console.log('Injecting Qwen cookies (Dual Domain)...');
          // Inject for both domains
          await this.injectCookies(this.modelConfig.auth.cookies, '.aliyun.com');
          await this.injectCookies(this.modelConfig.auth.cookies, '.qianwen.com');
          
          console.log('Reloading page and listening for auth signals...');
          
          // Setup Network Listener BEFORE reload to catch the boot-up requests
          const authCheckPromise = this.checkLoginByNetwork('api/v1', 10000); // Generalized pattern for Qwen API
          
          await this.page.reload();
          
          // Wait for either Network Success OR UI Success
          try {
              // Race between network confirmation and UI timeout
              const isNetworkAuth = await authCheckPromise;
              if (isNetworkAuth) {
                  console.log('Login confirmed via Network!');
                  return true;
              }
          } catch (e) {
              console.log('Network auth check timed out, falling back to UI check.');
          }

          await this.checkAndClosePopups();
          
          if (await this.isLoggedIn()) {
              console.log('Auto-login successful (UI verified)!');
              return true;
          }
      }
      
      return super.handleLogin(); // Fallback to manual wait
  }

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    // Ensure we are on the chat interface
    await this.page.waitForSelector(selectors.input);
    
    // Type query with slight delay to mimic human behavior
    await this.page.fill(selectors.input, query);
    await this.page.waitForTimeout(500); 

    // Click submit or press Enter
    const submitBtn = await this.page.$(selectors.submit);
    if (submitBtn) {
        console.log('Submit button found, clicking...');
        await submitBtn.click();
    } else {
        console.log('Submit button not found, pressing Enter...');
        await this.page.press(selectors.input, 'Enter');
    }
    console.log('Query sent.');
  }

  async waitForResponse(timeout = 300000) {
    console.log(`Qwen: Waiting for response (timeout: ${timeout}ms)...`);
    const selectors = this.modelConfig.selectors;
    
    try {
        // Wait for the response to start generating
        await this.page.waitForSelector(selectors.response, { timeout: 30000 });
    } catch(e) {
        console.error('Qwen: Response selector not found within timeout');
        return null;
    }

    // Smart Wait: Wait for generation to complete
    await this.waitForGenerationToComplete(selectors.response);

    // [Fix] Scroll to bottom to ensure elements are visible (lazy loading)
    console.log('Scrolling to bottom to reveal lazy-loaded elements...');
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(1000);
    
    return await this.extractResponse();
  }

  async extractResponse() {
    const selectors = this.modelConfig.selectors;
    
    // Get the last response bubble
    const responses = await this.page.$$(selectors.response);
    const lastResponse = responses[responses.length - 1];
    
    // Extract Text
    const text = await lastResponse.textContent();
    
    // Try to expand references (Qwen specific)
    try {
        console.log('Checking for Reference toggle...');
        
        // Check if side panel is already open
        const isSidePanelOpen = await this.page.evaluate(() => {
            // Common indicators for Qwen side panel
            const panels = document.querySelectorAll('div[class*="drawer"], div[class*="side-panel"], div[class*="reference-panel"]');
            for (const panel of panels) {
                if (panel.innerText.includes('参考') || panel.innerText.includes('来源')) {
                    const style = window.getComputedStyle(panel);
                    if (style.display !== 'none' && style.visibility !== 'hidden' && style.width !== '0px') {
                        return true;
                    }
                }
            }
            return false;
        });

        if (!isSidePanelOpen) {
            // Strategy: Look for "参考来源" button or any citation mark [1]
            // We prioritize the explicit "Reference" button if it exists
            
            // 1. Try "参考来源" text button (Relaxed match)
            const refToggle = await this.page.locator('div, span, button')
                .filter({ hasText: /参考来源/ })
                .filter({ hasNotText: /生成/ }) // Avoid "Generated from..."
                .last();
            
            if (await refToggle.isVisible()) {
                console.log('Found "参考来源" toggle, clicking...');
                // Ensure it's clickable (sometimes it's the parent div)
                await refToggle.click({ position: { x: 5, y: 5 } }).catch(async () => {
                     // Fallback: click parent
                     await refToggle.locator('..').click();
                });
                await this.page.waitForTimeout(3000); // Wait for animation
            } else {
                // 2. Try clicking the first citation mark [1]
                const citation = await this.page.locator('sup, span[class*="citation"]').first();
                if (await citation.isVisible()) {
                    console.log('Found citation mark, clicking to open sidebar...');
                    await citation.click();
                    await this.page.waitForTimeout(3000);
                }
            }
        } else {
            console.log('Side panel appears to be already open.');
        }

    } catch (e) {
        console.log('Error toggling references:', e);
    }

    // Extract Search Results and References from the Side Panel
    // Note: In Qwen, the side panel usually contains the references which act as search results.
    let references = await this.extractReferences(lastResponse);
    
    // Strict Mode: Qwen side panel contains everything.
    let searchResults = [];
    if (references.length > 0) {
        console.log(`Extracted ${references.length} references, mapping to search results...`);
        searchResults = references.map(ref => ({
            index: ref.index,
            title: ref.title,
            url: ref.url,
            // Use extracted source if available, otherwise fallback
            source: ref.source || 'Qwen Reference',
            domain: ref.domain || ref.source
        }));
    } else {
        // Fallback for search results only if absolutely needed, but for now we trust the side panel
        console.log('Qwen: No references found in side panel.');
    }

    /* Legacy Fallback
    else {
        // Try fallback extraction for search results if no references found
        searchResults = await this.extractSearchResults(lastResponse);
    }
    */

    // Format data as requested: 序号、信源域名、信源文章名、信源URL
    const formatSource = (item) => ({
        '序号': item.index || item.position,
        '信源域名': item.domain || item.source || 'N/A',
        '信源文章名': item.title || 'N/A',
        '信源URL': item.url || ''
    });

    const formattedSearchResults = searchResults.map(formatSource);
    const formattedReferences = references.map(formatSource);

    return {
        text: text,
        searchResults: searchResults,
        references: references,
        formattedSearchResults,
        formattedReferences,
        sources: searchResults,
        rawHtml: await lastResponse.innerHTML()
    };
  }

  async extractSearchResults(responseElement) {
    // This is now a fallback or secondary extraction
    // ... logic remains but might need update if we want to extract from panel specifically
    // For now, let's rely on extractReferences to do the heavy lifting from the panel
    return [];
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
    console.log('Qwen: Extracting references from side panel...');
    try {
        const rawRefs = await this.page.evaluate(async () => {
             const refs = [];
             const cleanUrl = (u) => {
                if (!u) return '';
                if (u.startsWith('//')) return 'https:' + u;
                return u;
            };
            
            // 1. Find the Side Panel
            // We look for a container on the right side of the screen
            // Common traits: fixed/absolute position, right:0, high z-index, contains "来源" or "引用"
            
            const allDivs = Array.from(document.querySelectorAll('div'));
            console.log(`Checking ${allDivs.length} divs for side panel candidates...`);
            
            const sidePanel = allDivs.find(div => {
                const style = window.getComputedStyle(div);
                const rect = div.getBoundingClientRect();
                
                // Check if it's on the right side and has substantial height
                const isRightSide = rect.left > window.innerWidth / 2;
                const isTall = rect.height > window.innerHeight * 0.5;
                const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                
                if (isRightSide && isTall && isVisible) {
                     const text = div.innerText || '';
                     const hasKeywords = text.includes('来源') || text.includes('引用') || text.includes('参考');
                     const linkCount = div.querySelectorAll('a').length;
                     console.log(`Candidate: Right=${isRightSide}, Tall=${isTall}, Visible=${isVisible}, Keywords=${hasKeywords} (${text.substring(0, 20)}...), Links=${linkCount}, Class=${div.className}`);
                     
                     // Accept if it has keywords, even if no links found yet (maybe they are not <a> tags)
                     return hasKeywords;
                }
                return false;
            });
            
            if (sidePanel) {
                 // Strategy 1: Look for reference detail boxes (Qwen specific)
                 // Class name roughly: referenceDetailBox-tRDq2I
                 const detailBoxes = Array.from(sidePanel.querySelectorAll('div[class*="referenceDetailBox"]'));
                 console.log(`Qwen: Found ${detailBoxes.length} reference detail boxes in side panel.`);
                 
                 // React Fiber Helper
                 const getReactUrl = (el) => {
                    try {
                        const key = Object.keys(el).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
                        if (!key) return null;
                        
                        let fiber = el[key];
                        let attempts = 0;
                        while (fiber && attempts < 20) {
                            const props = fiber.memoizedProps || fiber.pendingProps;
                            if (props) {
                                // Check common patterns for data passing
                                if (props.url) return props.url;
                                if (props.data && props.data.url) return props.data.url;
                                if (props.item && props.item.url) return props.item.url;
                                if (props.reference && props.reference.url) return props.reference.url;
                                // Sometimes it's in children props
                                if (props.children && props.children.props && props.children.props.url) return props.children.props.url;
                            }
                            fiber = fiber.return;
                            attempts++;
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
                 };

                 if (detailBoxes.length > 0) {
                     let position = 1;
                     detailBoxes.forEach(box => {
                         // Title
                         const titleEl = box.querySelector('div[class*="referenceBoxTitleText"]');
                         const title = titleEl ? titleEl.innerText.trim() : '';
                         
                         // Source
                         const sourceEl = box.querySelector('div[class*="referenceLinkLine"]');
                         const source = sourceEl ? sourceEl.innerText.trim() : '';
                         
                         // URL - Try to find it in attributes or child elements
                         let url = '';
                         const aTag = box.querySelector('a');
                         if (aTag) {
                             url = aTag.href;
                         } else {
                             // Try React Props extraction first (most reliable for SPA)
                             url = getReactUrl(box);

                             if (!url) {
                                 // Check attributes for common URL patterns
                                 for (const attr of box.attributes) {
                                     if ((attr.name.includes('url') || attr.name.includes('href')) && (attr.value.startsWith('http') || attr.value.startsWith('//'))) {
                                         url = attr.value;
                                         break;
                                     }
                                 }
                             }
                             
                             // If still not found, search ALL child elements for url-like attributes
                             if (!url) {
                                 const allChildren = box.querySelectorAll('*');
                                 for (const child of allChildren) {
                                     if (child.tagName === 'A' && child.href) {
                                         url = child.href;
                                         break;
                                     }
                                     for (const attr of child.attributes) {
                                         if ((attr.name.includes('url') || attr.name.includes('href') || attr.name === 'title') && (attr.value.startsWith('http') || attr.value.startsWith('//'))) {
                                             url = attr.value;
                                             break;
                                         }
                                     }
                                     if (url) break;
                                 }
                             }
                         }
                         
                         if (url && url.startsWith('//')) url = 'https:' + url;
                         
                         if (title) {
                             refs.push({
                                 index: position,
                                 title: title,
                                 url: url || '', // Empty string if no URL found
                                 source: source,
                                 domain: source // Default domain to source name
                             });
                             position++;
                         }
                     });
                 } else {
                     // Strategy 2: Generic link extraction (Fallback)
                     console.log('Qwen: No detail boxes found, falling back to generic link extraction...');
                     let links = Array.from(sidePanel.querySelectorAll('a'));
                     
                     // Fallback: look for elements with data-url or similar
                     if (links.length === 0) {
                         console.log('No <a> tags found in side panel. Looking for other link-like elements...');
                         const allElements = sidePanel.querySelectorAll('*');
                         for (const el of allElements) {
                             if (el.hasAttribute('href') || el.hasAttribute('data-url') || el.hasAttribute('data-href')) {
                                 links.push(el);
                             }
                         }
                     }
                     
                     console.log(`Found ${links.length} potential links in side panel.`);
                     
                     let position = 1;
                     links.forEach(link => {
                         const href = link.getAttribute('href') || link.getAttribute('data-url') || link.getAttribute('data-href');
                         const title = link.innerText.replace(/\n/g, ' ').trim();
                         
                         // Filter valid external links
                         if (href && (href.startsWith('http') || href.startsWith('//')) && 
                             !href.includes('aliyun.com') && !href.includes('javascript') &&
                             title.length > 2) {
                                 
                             // Avoid duplicates
                             if (!refs.find(r => r.url === cleanUrl(href))) {
                                 refs.push({
                                     index: position,
                                     title: title,
                                     url: cleanUrl(href),
                                     source: '', // No explicit source in generic links usually
                                     domain: '' // Will be filled later
                                 });
                                 position++;
                             }
                         }
                     });
                 }
            }
            
            // Fallback: Check for inline citations if panel failed
            if (refs.length === 0) {
                // ... (existing inline logic if needed, or just return empty)
            }
             
             return refs;
        });

        // Post-processing to fill in missing domains
        return rawRefs.map(ref => ({
            index: ref.index,
            domain: ref.domain || ref.source || this.extractDomain(ref.url),
            title: ref.title,
            url: ref.url,
            source: ref.source || ref.domain || 'Qwen Reference'
        }));

    } catch (e) {
        console.error('Error extracting Qwen references:', e);
        return [];
    }
  }

  // Deprecated
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
          // Check 1: Is "Regenerate" button visible?
          // Note: Selector might need adjustment based on exact UI
          const regenerateBtn = await this.page.$(this.modelConfig.selectors.regenerate || 'div[class*="regenerate"]');
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
                  // console.log(`Generation in progress... Length: ${currentLength}`);
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

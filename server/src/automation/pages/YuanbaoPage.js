import { BasePage } from './BasePage.js';

export class YuanbaoPage extends BasePage {
  constructor(page) {
    super(page, 'yuanbao');
  }

  async isLoggedIn() {
      // 1. Check for Login Button (Strong indicator of NOT logged in)
      const loginBtnSelector = 'button:has-text("登录"), div:has-text("登录"):visible, .agent-dialogue__tool__login';
      const loginBtn = await this.page.$(loginBtnSelector);
      
      if (loginBtn) {
          const isVisible = await loginBtn.isVisible();
          console.log(`Login button found (${loginBtnSelector}). Visible: ${isVisible}`);
          if (isVisible) {
              console.log('Login button detected and visible. Not logged in.');
              return false;
          }
      } else {
          console.log('Login button not found.');
      }

      // 2. Check for User Avatar (Strong indicator of logged in)
      const avatarSelector = '.user-avatar, img[alt*="头像"], .user-center-avatar';
      const avatar = await this.page.$(avatarSelector);
      if (avatar && await avatar.isVisible()) {
          console.log('User avatar found. Logged in.');
          return true;
      }
      console.log('User avatar not found.');

      // 3. Fallback: Check for Input
      try {
        const input = await this.page.waitForSelector(this.modelConfig.selectors.input, { timeout: 5000, state: 'visible' });
        const placeholder = await input.getAttribute('placeholder');
        console.log(`Input found. Placeholder: ${placeholder}`);
        
        console.log('Input found but Avatar not found. Assuming not logged in (or Guest mode).');
        return false;
      } catch (e) {
        console.log('Input not found or not visible.');
        return false;
      }
  }

  async handleLogin() {
    // Setup Network Listener
    // Yuanbao uses /api/user/info or similar
    const authCheckPromise = this.checkLoginByNetwork(/api\/(user|chat|conversation)/, 10000);

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

  async sendQuery(query) {
    const selectors = this.modelConfig.selectors;
    
    await this.checkAndClosePopups();

    // Wait for input to be ready
    await this.page.waitForSelector(selectors.input, { state: 'visible', timeout: 15000 });
    
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

    // Try pressing Enter first
    console.log('Pressing Enter to submit...');
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(2000);

    // Check if login modal appeared after Enter
    const loginModal = await this.page.$('.login-modal, div[class*="login-dialog"], .t-dialog');
    if (loginModal && await loginModal.isVisible()) {
        console.error('Login modal appeared after submitting query!');
        throw new Error('Login required to chat');
    }

    // Backup: Click submit if button exists and looks active
    const submitBtn = await this.page.$(selectors.submit);
    if (submitBtn && await submitBtn.isVisible()) {
        console.log('Clicking submit button as backup...');
        try {
            await submitBtn.click({ force: true });
        } catch (e) {
            console.log('Click failed:', e.message);
        }
    }

    // Wait for response generation to start
    console.log('Waiting for response...');
  }

  async waitForResponse(timeout = 30000) {
    // Override base method to use a broader selector check and stabilization
    // BUT avoid matching homepage suggestions.
    const selectors = [
        '.answer-content', 
        '.markdown-body', 
        '.agent-message-content',
        // 'div[class*="agent-chat"]' // Too broad
    ];
    
    const combinedSelector = selectors.join(', ');
    console.log(`Waiting for any of: ${combinedSelector}`);

    try {
        await this.page.waitForSelector(combinedSelector, { state: 'visible', timeout: timeout });
        
        // Wait for generation to complete (stabilization)
        await this.waitForGenerationToComplete(combinedSelector);

        // Get the text of the LAST match
        const elements = await this.page.$$(combinedSelector);
        if (elements.length > 0) {
            const lastElement = elements[elements.length - 1];
            const text = await lastElement.innerText();
            
            // Extract Search Results and References
            const searchResults = await this.extractSearchResults(lastElement);
            const references = await this.extractReferences(lastElement);

            return {
                text,
                searchResults,
                references
            };
        }
        return { text: '', searchResults: [], references: [] };
    } catch (e) {
        console.error(`Wait for response failed: ${e.message}`);
        throw e;
    }
  }

  async extractSearchResults(responseElement) {
      console.log('Yuanbao: Extracting search results...');
      try {
          return await this.page.evaluate((el) => {
              const results = [];
              const cleanUrl = (u) => {
                  if (!u) return '';
                  if (u.startsWith('//')) return 'https:' + u;
                  return u;
              };

              const addSource = (title, url, source) => {
                  if (url && url.startsWith('http') && !results.find(s => s.url === url)) {
                      results.push({ 
                          title: title.trim(), 
                          url: url,
                          source: source || 'Yuanbao Search',
                          position: results.length + 1
                      });
                  }
              };

              // 1. Look for search result cards or links within the response
              // Yuanbao often puts sources in a specific container or as links
              const links = el.querySelectorAll('a');
              links.forEach(link => {
                  const href = link.getAttribute('href');
                  const text = link.innerText;
                  // Filter valid external links
                  if (href && href.startsWith('http') && text.length > 5) {
                       // Avoid internal links or simple navigation
                       if (!href.includes('yuanbao.tencent.com')) {
                           addSource(text, cleanUrl(href), 'Yuanbao Link');
                       }
                  }
              });

              return results;
          }, responseElement);
      } catch (e) {
          console.error('Error extracting Yuanbao search results:', e);
          return [];
      }
  }

  async extractReferences(responseElement) {
      console.log('Yuanbao: Extracting references...');
      try {
          return await this.page.evaluate((el) => {
              const refs = [];
              
              // Look for reference lists (usually at bottom)
              const refLists = el.querySelectorAll('div[class*="reference"], div[class*="source"], ul, ol');
              
              refLists.forEach(list => {
                  // Check if it looks like a reference list (contains links and numbers)
                  if (list.innerText.includes('参考') || list.innerText.includes('Sources') || list.querySelectorAll('li').length > 0) {
                      const items = list.querySelectorAll('li, div[class*="item"]');
                      items.forEach((item, index) => {
                          const link = item.querySelector('a');
                          if (link) {
                              const href = link.getAttribute('href');
                              if (href && href.startsWith('http')) {
                                  refs.push({
                                      id: (index + 1).toString(),
                                      title: item.innerText.replace(/\[\d+\]/g, '').trim(),
                                      url: href
                                  });
                              }
                          }
                      });
                  }
              });

              return refs;
          }, responseElement);
      } catch (e) {
          console.error('Error extracting Yuanbao references:', e);
          return [];
      }
  }

  // Legacy support
  async extractSources(responseElement) {
      return await this.extractSearchResults(responseElement);
  }

  async waitForGenerationToComplete(selector) {
    console.log('Waiting for generation to complete...');
    // Simple stabilization wait: wait for text content to stop changing
    let lastText = '';
    let retries = 0;
    const maxRetries = 30; // 30 * 1000ms = 30s max wait
    
    while (retries < maxRetries) {
        await this.page.waitForTimeout(1000);
        const elements = await this.page.$$(selector);
        if (elements.length === 0) continue;
        
        const lastElement = elements[elements.length - 1];
        const text = await lastElement.textContent();
        
        // Basic heuristic: text length > 0 and unchanged for 1 sec
        if (text === lastText && text.length > 0) { 
            console.log('Generation complete (Content stable).');
            return;
        }
        lastText = text;
        retries++;
    }
    console.log('Generation wait timeout, returning current content.');
  }
}

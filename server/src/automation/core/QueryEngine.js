import { browserManager } from './BrowserManager.js';
import { SessionManager } from './SessionManager.js';
import { WenxinPage } from '../pages/WenxinPage.js';
import { QwenPage } from '../pages/QwenPage.js';
import { DeepseekPage } from '../pages/DeepseekPage.js';
import { KimiPage } from '../pages/KimiPage.js';
import { DoubaoPage } from '../pages/DoubaoPage.js';
import { YuanbaoPage } from '../pages/YuanbaoPage.js';

const PageClasses = {
  wenxin: WenxinPage,
  qwen: QwenPage,
  deepseek: DeepseekPage,
  kimi: KimiPage,
  doubao: DoubaoPage,
  yuanbao: YuanbaoPage
};

export class QueryEngine {
  constructor() {
    this.results = [];
    this.sessionManager = new SessionManager();
  }

  async runQuery(modelKey, query) {
    let context = null;
    try {
      // 1. Load Session (Cookies) if available
      // const sessionState = await this.sessionManager.loadSession(modelKey);
      
      // 2. Create Context with Session
      // context = await browserManager.newContext(sessionState ? { storageState: sessionState } : {});
      
      // Disable auto-load session to force env injection every time
      context = await browserManager.newContext({});
      
      const page = await context.newPage();
      
      const PageClass = PageClasses[modelKey] || (await import('../pages/BasePage.js')).BasePage;
      const modelPage = new PageClass(page, modelKey); 

      const startTime = Date.now();
      
      await modelPage.navigate();

      // 3. Handle Login (Auto check or Manual fallback)
      if (typeof modelPage.handleLogin === 'function') {
        const loginNeeded = await modelPage.handleLogin();
        
        // 4. Save Session if login was required/refreshed
        // We can also just save periodically or on every successful interaction
        // checking loginNeeded return value might be useful
        /* 
        if (loginNeeded !== false) { // Assuming handleLogin returns true if manual login occurred, or we just save anyway
            console.log('Updating session storage...');
            await this.sessionManager.saveSession(modelKey, context);
        }
        */
       // Disable auto-save session to prevent overwriting env config with potentially invalid state
      }

      await modelPage.sendQuery(query);
      
      // Use model-specific timeout or default
      const responseTimeout = modelPage.modelConfig.timeout || 60000;
      const response = await modelPage.waitForResponse(responseTimeout);
      
      const endTime = Date.now();

      return {
        model: modelKey,
        query,
        response,
        status: response ? 'success' : 'failed',
        metrics: {
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error(`Query failed for ${modelKey}:`, error);
      
      // Debug: Save screenshot and HTML
      if (context && context.pages().length > 0) {
        const page = context.pages()[0];
        try {
          await page.screenshot({ path: `error_screenshot_${modelKey}.png` });
          const content = await page.content();
          const fs = await import('fs');
          fs.writeFileSync(`error_page_${modelKey}.html`, content);
          console.log(`Saved debug info for ${modelKey}`);
        } catch (debugError) {
          console.error('Failed to save debug info:', debugError);
        }
      }

      return {
        model: modelKey,
        query,
        error: error.message,
        status: 'error',
        metrics: {
          timestamp: new Date().toISOString()
        }
      };
    } finally {
      if (context) {
        await context.close();
      }
    }
  }
}

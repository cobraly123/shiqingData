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
      const sessionState = await this.sessionManager.loadSession(modelKey);
      
      // 2. Create Context with Session
      // If session exists, use it. Otherwise, create a fresh context.
      context = await browserManager.newContext(sessionState ? { storageState: sessionState } : {});
      
      const page = await context.newPage();
      
      const PageClass = PageClasses[modelKey] || (await import('../pages/BasePage.js')).BasePage;
      const modelPage = new PageClass(page, modelKey); 

      const startTime = Date.now();
      
      await modelPage.navigate();

      // 3. Handle Login (Auto check or Manual fallback)
      if (typeof modelPage.handleLogin === 'function') {
        const isLoggedIn = await modelPage.handleLogin();
        
        // 4. Save Session if login successful
        if (isLoggedIn) {
            console.log(`Login confirmed for ${modelKey}, updating session storage...`);
            await this.sessionManager.saveSession(modelKey, context);
        } else {
            console.warn(`Login failed for ${modelKey}. Aborting query to prevent false positives.`);
            throw new Error(`Login failed for ${modelKey}. Cannot proceed with query.`);
        }
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
        response: null,
        status: 'failed',
        error: error.message,
        metrics: {
            duration: 0,
            timestamp: new Date().toISOString()
        }
      };
    } finally {
        // Optional: Close context if needed, but BrowserManager handles browser lifecycle
        if (context) await context.close();
    }
  }
}

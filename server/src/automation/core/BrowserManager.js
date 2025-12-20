import { chromium } from 'playwright';
import { config } from '../config/config.js';

class BrowserManager {
  constructor() {
    this.browser = null;
  }

  async initialize(options = {}) {
    if (!this.browser) {
      const headless = options.headless !== undefined ? options.headless : config.global.headless;
      console.log('Initializing browser with headless:', headless);
      this.browser = await chromium.launch({
        headless: headless,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
      });
      console.log('Browser initialized');
    }
  }

  async newContext(options = {}) {
    if (!this.browser) {
      await this.initialize();
    }
    
    // Default context options for better stealth
    const defaultContextOptions = {
        viewport: config.global.viewport,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        permissions: ['geolocation'],
        ignoreHTTPSErrors: true,
        ...options
    };

    const context = await this.browser.newContext(defaultContextOptions);

    // Inject Stealth Scripts to hide automation signals
    await context.addInitScript(() => {
        // 1. Overwrite navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        // 2. Mock languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh', 'en-US', 'en'],
        });

        // 3. Mock plugins (basic)
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });

        // 4. Mock window.chrome
        window.chrome = { runtime: {} };

        // 5. Mask permission query
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
            Promise.resolve({ state: 'denied' }) :
            originalQuery(parameters)
        );
    });

    return context;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('Browser closed');
    }
  }
}

export const browserManager = new BrowserManager();

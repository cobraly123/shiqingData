import { chromium } from 'playwright';
import { config } from '../config/config.js';

export class BrowserManager {
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
    
    // Randomize Viewport slightly to avoid fingerprinting
    const baseViewport = config.global.viewport || { width: 1280, height: 800 };
    const randomViewport = {
        width: baseViewport.width + Math.floor(Math.random() * 100 - 50),
        height: baseViewport.height + Math.floor(Math.random() * 100 - 50)
    };

    // Random User Agent
    const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    // Default context options for better stealth
    const defaultContextOptions = {
        viewport: randomViewport,
        userAgent: randomUserAgent,
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

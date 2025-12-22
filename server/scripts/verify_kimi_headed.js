
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables BEFORE importing config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { chromium } from 'playwright';
import { KimiPage } from '../src/automation/pages/KimiPage.js';
import { config } from '../src/automation/config/config.js';

// Ensure config has the loaded cookies
if (process.env.KIMI_COOKIES) {
    config.models.kimi.auth.cookies = process.env.KIMI_COOKIES;
}
if (process.env.KIMI_LOCAL_STORAGE) {
    config.models.kimi.auth.localStorage = process.env.KIMI_LOCAL_STORAGE;
}

async function verifyKimi() {
  console.log('Starting Kimi Verification (Headless: false)...');
  
  const userDataDir = path.resolve(__dirname, '../user_data/kimi');
  console.log(`Using User Data Dir: ${userDataDir}`);

  // Launch persistent context
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled' // Hide automation flag
    ],
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai'
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    const kimiPage = new KimiPage(page);
    
    // 1. Navigate
    await kimiPage.navigate();
    
    // 2. Handle Login
    // With persistent context, we might already be logged in. 
    // We still call handleLogin to verify and wait for manual login if needed.
    // We disable cookie injection here to rely on the persistent profile.
    // To do this, we can temporarily clear the config cookies/LS or just let it try (it won't hurt).
    // Actually, better to let KimiPage check login status first.
    
    const isLoggedIn = await kimiPage.isLoggedIn();
    if (isLoggedIn) {
        console.log('Already logged in via persistent profile!');
    } else {
        console.log('Not logged in. Please login manually...');
        const loginSuccess = await kimiPage.handleLogin(); // This will trigger manual login wait
        if (!loginSuccess) {
             throw new Error('Login failed.');
        }
    }

    console.log('✅ Kimi Login Successful!');
      
    // 3. Send Query
    const query = '你好，请做一个自我介绍，不超过50字。';
    console.log(`Sending query: "${query}"`);
    await kimiPage.sendQuery(query);
      
    // 4. Extract Response
    console.log('Waiting for response...');
    let result;
    try {
        result = await kimiPage.extractResponse();
        console.log('\n--- Response Received ---');
        console.log(result.text);
        console.log('-------------------------\n');
        
        if (!result.text || result.text.trim().length === 0) {
             console.log('Response text is empty. Dumping page content...');
             const content = await page.content();
             fs.writeFileSync(path.resolve(__dirname, '../kimi_response_debug.html'), content);
             console.log('Saved to kimi_response_debug.html');
        }
    } catch (e) {
        console.error('Failed to extract response:', e);
        console.log('Dumping page content for debugging...');
        const content = await page.content();
        fs.writeFileSync(path.resolve(__dirname, '../kimi_response_debug.html'), content);
        console.log('Saved to kimi_response_debug.html');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    console.log('Closing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await context.close();
  }
}

verifyKimi();

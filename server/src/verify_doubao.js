import 'dotenv/config';
import { browserManager } from './automation/core/BrowserManager.js';
import { DoubaoPage } from './automation/pages/DoubaoPage.js';

async function verify() {
  console.log('Starting Doubao Login Verification (Headless: FALSE)...');
  
  try {
    // 1. Init Browser
    await browserManager.initialize({ headless: false });
    const context = await browserManager.newContext();
    const page = await context.newPage();

    // 2. Init Doubao Page
    const doubao = new DoubaoPage(page);
    
    // 3. Navigate
    console.log('Navigating to Doubao...');
    await page.goto('https://www.doubao.com/chat/', { waitUntil: 'domcontentloaded' });
    
    // 4. Check Login
    console.log('Checking login status...');
    const loggedIn = await doubao.isLoggedIn();
    console.log('Initial Login Status:', loggedIn);

    if (!loggedIn) {
        console.log('Not logged in. Attempting handleLogin flow...');
        // handleLogin usually handles navigation too, but we are already there.
        // It's safe to call it.
        await doubao.handleLogin();
    } else {
        console.log('Already logged in!');
    }

    // 5. Test Query
    console.log('Testing query capability...');
    const testQuery = "你好，请回复'测试成功'";
    console.log(`Sending query: "${testQuery}"`);
    await doubao.sendQuery(testQuery);
    
    console.log('Waiting for response...');
    const response = await doubao.waitForResponse();
    console.log('Response received:', response);

    console.log('Verification complete. Browser will remain open for 60 seconds for observation...');
    await new Promise(r => setTimeout(r, 60000));

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await browserManager.close();
  }
}

verify();

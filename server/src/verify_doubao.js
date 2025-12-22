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

    console.log('Verification complete. Browser will remain open for 60 seconds for observation...');
    await new Promise(r => setTimeout(r, 60000));

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await browserManager.close();
  }
}

verify();

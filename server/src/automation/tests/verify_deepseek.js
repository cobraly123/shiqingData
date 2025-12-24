
import 'dotenv/config';
import { browserManager } from '../core/BrowserManager.js';
import { SessionManager } from '../core/SessionManager.js';
import { DeepseekPage } from '../pages/DeepSeekPage.js';

async function verifyDeepseekExtraction() {
  console.log('Starting Deepseek Extraction Verification...');
  
  // Force headless to false for visual verification as requested
  const headless = false; 
  
  await browserManager.initialize({ headless });
  
  const sessionManager = new SessionManager();
  const modelKey = 'deepseek';
  
  console.log('Attempting to load saved session...');
  const sessionState = await sessionManager.loadSession(modelKey);
  
  const context = await browserManager.newContext(sessionState ? { storageState: sessionState } : {});
  const page = await context.newPage();
  
  // Enable console log forwarding
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const deepseek = new DeepseekPage(page);
  
  try {
    console.log('Navigating to Deepseek...');
    await deepseek.navigate();
    
    // Login flow
    const loggedIn = await deepseek.handleLogin();
    if (!loggedIn) {
        console.error('Login failed. Please login manually in the browser window if it opens.');
        // In headless=false, we can wait a bit for manual login
        await page.waitForTimeout(60000); // Give user 1 minute to login
    }
    
    if (await deepseek.isLoggedIn()) {
        console.log('✅ Login verified!');
        await sessionManager.saveSession(modelKey, context);
        
        const query = "2024年奥运会金牌榜";
        console.log(`Sending query: ${query}`);
        
        await deepseek.sendQuery(query);
        
        console.log('Waiting for response and extraction...');
        // Use waitForResponse to ensure generation is complete (stability check)
        const result = await deepseek.waitForResponse(120000); // 2 minute timeout for Deepseek
        
        console.log('\n----------------------------------------');
        console.log('EXTRACTION RESULTS');
        console.log('----------------------------------------');
        console.log(`Response Length: ${result.text.length} chars`);
        
        console.log('\n[References]');
        if (result.references && result.references.length > 0) {
            result.references.forEach(r => {
                console.log(`- [${r.index}] Domain: ${r.domain} | Title: ${r.title} | URL: ${r.url}`);
            });
        } else {
            console.log('No references extracted.');
        }
        
        console.log('----------------------------------------\n');
        
    } else {
        console.error('Could not verify login status.');
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    console.log('Closing browser in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browserManager.close();
  }
}

verifyDeepseekExtraction();

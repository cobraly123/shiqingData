import 'dotenv/config';
import { browserManager } from '../core/BrowserManager.js';
import { SessionManager } from '../core/SessionManager.js';
import { QwenPage } from '../pages/QwenPage.js';

async function verifyQwenExtraction() {
  console.log('Starting Qwen Extraction Verification...');
  
  // Force headless to false for visual verification
  const headless = false; 
  
  await browserManager.initialize({ headless });
  
  const sessionManager = new SessionManager();
  const modelKey = 'qwen';
  
  console.log('Attempting to load saved session...');
  const sessionState = await sessionManager.loadSession(modelKey);
  
  const context = await browserManager.newContext(sessionState ? { storageState: sessionState } : {});
  const page = await context.newPage();
  
  // Enable console log forwarding
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const qwen = new QwenPage(page);
  
  try {
    console.log('Navigating to Qwen...');
    await qwen.navigate();
    
    // Login flow
    const loggedIn = await qwen.handleLogin();
    if (!loggedIn) {
        console.error('Login failed. Please login manually in the browser window if it opens.');
        // In headless=false, we can wait a bit for manual login
        await page.waitForTimeout(60000);
    }
    
    if (await qwen.isLoggedIn()) {
        console.log('✅ Login verified!');
        await sessionManager.saveSession(modelKey, context);
        
        const query = "2024年奥运会金牌榜";
        console.log(`Sending query: ${query}`);
        
        await qwen.sendQuery(query);
        
        console.log('Waiting for response and extraction...');
        // Use waitForResponse instead of extractResponse for stability and auto-scroll
        const result = await qwen.waitForResponse(120000);
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'qwen_debug.png' });
        console.log('Screenshot saved to qwen_debug.png');

        // Save HTML for debugging
        const html = await page.content();
        const fs = await import('fs');
        fs.writeFileSync('qwen_debug.html', html);
        console.log('HTML saved to qwen_debug.html');

        
        console.log('\n----------------------------------------');
        console.log('EXTRACTION RESULTS');
        console.log('----------------------------------------');
        if (result) {
            console.log(`Response Length: ${result.text.length} chars`);
            
            console.log('\n[Search Results]');
            if (result.searchResults && result.searchResults.length > 0) {
                result.searchResults.forEach(r => {
                    console.log(`- [${r.source}] ${r.title} (${r.url})`);
                });
            } else {
                console.log('No search results extracted.');
            }
            
            console.log('\n[References]');
            if (result.references && result.references.length > 0) {
                result.references.forEach(r => {
                    console.log(`- [${r.index}] Domain: ${r.domain} | Title: ${r.title} | URL: ${r.url}`);
                });
            } else {
                console.log('No references extracted.');
            }
        } else {
            console.log('No result returned (null).');
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

verifyQwenExtraction();

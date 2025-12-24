
import 'dotenv/config';
import { browserManager } from '../core/BrowserManager.js';
import { SessionManager } from '../core/SessionManager.js';
import { DoubaoPage } from '../pages/DoubaoPage.js';

async function verifyDoubaoExtraction() {
  console.log('Starting Doubao Extraction Verification...');
  
  // Force headless to false for visual verification as requested
  const headless = false; 
  
  await browserManager.initialize({ headless });
  
  const sessionManager = new SessionManager();
  const modelKey = 'doubao';
  
  console.log('Attempting to load saved session...');
  const sessionState = await sessionManager.loadSession(modelKey);
  
  const context = await browserManager.newContext(sessionState ? { storageState: sessionState } : {});
  const page = await context.newPage();
  
  // Enable console log forwarding
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const doubao = new DoubaoPage(page);
  
  try {
    console.log('Navigating to Doubao...');
    await doubao.navigate();
    
    // Login flow
    const loggedIn = await doubao.handleLogin();
    if (!loggedIn) {
        console.error('Login failed. Please login manually in the browser window if it opens.');
        // In headless=false, we can wait a bit for manual login
        await page.waitForTimeout(60000); // Give user 1 minute to login
    }
    
    if (await doubao.isLoggedIn()) {
        console.log('✅ Login verified!');
        await sessionManager.saveSession(modelKey, context);
        
        const query = "2024年奥运会金牌榜";
        console.log(`Sending query: ${query}`);
        
        await doubao.sendQuery(query);
        
        console.log('Waiting for response and extraction...');
        // Use waitForResponse instead of extractResponse
        const result = await doubao.waitForResponse(120000);
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'doubao_debug.png' });
        console.log('Screenshot saved to doubao_debug.png');

        // Save HTML for debugging
        const html = await page.content();
        const fs = await import('fs');
        fs.writeFileSync('doubao_debug.html', html);
        console.log('HTML saved to doubao_debug.html');

        console.log('\n----------------------------------------');
        console.log('EXTRACTION RESULTS');
        console.log('----------------------------------------');
        if (result) {
            console.log(`Response Length: ${result.text.length} chars`);
            
            console.log('\n[References]');
            if (result.references && result.references.length > 0) {
                result.references.forEach(r => {
                    console.log(`- [${r.index}] Domain: ${r.domain} | Title: ${r.title} | URL: ${r.url}`);
                });
            } else {
                console.log('No references extracted.');
            }
        } else {
             console.log('Result is null.');
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

verifyDoubaoExtraction();

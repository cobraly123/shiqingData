import 'dotenv/config';
import { browserManager } from '../core/BrowserManager.js';
import { SessionManager } from '../core/SessionManager.js';
import { WenxinPage } from '../pages/WenxinPage.js';

async function verifyWenxinExtraction() {
  console.log('Starting Wenxin Extraction Verification...');
  
  // Force headless to false for visual verification
  const headless = false; 
  
  await browserManager.initialize({ headless });
  
  const sessionManager = new SessionManager();
  const modelKey = 'wenxin';
  
  console.log('Attempting to load saved session...');
  const sessionState = await sessionManager.loadSession(modelKey);
  
  const context = await browserManager.newContext(sessionState ? { storageState: sessionState } : {});
  const page = await context.newPage();
  
  // Enable console log forwarding
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const wenxin = new WenxinPage(page);
  
  try {
    console.log('Navigating to Wenxin...');
    await wenxin.navigate();
    
    // Login flow
    const loggedIn = await wenxin.handleLogin();
    if (!loggedIn) {
        console.error('Login failed. Please login manually in the browser window if it opens.');
        // In headless=false, we can wait a bit for manual login
        await page.waitForTimeout(60000); // Give 60s for manual login
    }
    
    if (await wenxin.isLoggedIn()) {
        console.log('✅ Login verified!');
        await sessionManager.saveSession(modelKey, context);
        
        // Use a query likely to trigger references/search
        const query = "Deepseek R1 模型的特点是什么？";
        console.log(`Sending query: ${query}`);
        
        await wenxin.sendQuery(query);
        
        console.log('Waiting for response and extraction...');
        // Use waitForResponse to ensure generation is complete (stability check)
        const result = await wenxin.waitForResponse(120000); // 2 minute timeout
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'wenxin_debug.png' });
        console.log('Screenshot saved to wenxin_debug.png');

        // Save HTML for debugging
        const html = await page.content();
        const fs = await import('fs');
        fs.writeFileSync('wenxin_debug.html', html);
        console.log('HTML saved to wenxin_debug.html');

        
        console.log('\n----------------------------------------');
        console.log('EXTRACTION RESULTS');
        console.log('----------------------------------------');
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
        
        console.log('----------------------------------------\n');
        
    } else {
        console.error('Could not verify login status.');
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    console.log('Closing browser in 30 seconds to allow inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browserManager.close();
  }
}

verifyWenxinExtraction();

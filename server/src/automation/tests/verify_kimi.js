import 'dotenv/config'; // Load environment variables
import { browserManager } from '../core/BrowserManager.js';
import { SessionManager } from '../core/SessionManager.js'; // Import SessionManager
import { KimiPage } from '../pages/KimiPage.js';
import { config } from '../config/config.js';

async function verifyKimiMonitor() {
  console.log('Starting Kimi Monitor Verification with Automated Login...');
  
  // Force headless to false for debugging visibility (optional, can be true)
  const headless = false; 
  
  await browserManager.initialize({ headless });
  
  // Initialize SessionManager
  const sessionManager = new SessionManager();
  const modelKey = 'kimi';
  
  // 1. Try to load existing session
  console.log('Attempting to load saved session...');
  const sessionState = await sessionManager.loadSession(modelKey);
  
  // 2. Create Context (with session if available)
  const context = await browserManager.newContext(sessionState ? { storageState: sessionState } : {});
  const page = await context.newPage();
  
  const kimi = new KimiPage(page);
  
  try {
    // 3. Navigate
    await kimi.navigate();
    
    console.log('Waiting 10 seconds for page to settle (as requested)...');
    await page.waitForTimeout(10000);
    
    // 4. Handle Login (Auto check -> Token/Env Injection -> Manual fallback)
    // This uses the project's standard login flow
    const loggedIn = await kimi.handleLogin();
    
    if (loggedIn) {
        console.log('✅ Login successful!');
        // 5. Save session for future runs (Project capability)
        await sessionManager.saveSession(modelKey, context);
        
        // 6. Send a Test Query to generate traffic and test extraction
        const query = "2024年奥运会金牌榜";
        console.log(`Sending query: ${query}`);
        
        // Handle popups before querying
        await kimi.checkAndClosePopups();
        
        await kimi.sendQuery(query);
        
        console.log('Waiting for response...');
        const result = await kimi.waitForResponse();
        
        console.log('\n----------------------------------------');
        console.log('EXTRACTION RESULTS');
        console.log('----------------------------------------');
        console.log(`Response Length: ${result.text ? result.text.length : 0} chars`);
        
        console.log('\n[References]');
        if (result.references && result.references.length > 0) {
            result.references.forEach(r => {
                console.log(`- [${r.index}] Domain: ${r.domain} | Title: ${r.title} | URL: ${r.url}`);
            });
        } else {
            console.log('No references extracted.');
        }

        console.log('\n[Search Results]');
        if (result.searchResults && result.searchResults.length > 0) {
            result.searchResults.forEach(r => {
                console.log(`- Title: ${r.title} | URL: ${r.url} | Source: ${r.source}`);
            });
        } else {
            console.log('No search results extracted.');
        }
        
        console.log('----------------------------------------\n');
        
        // 7. Dump page HTML for structure analysis
        const fs = await import('fs');
        const path = await import('path');
        const html = await page.content();
        const htmlFile = path.join(process.cwd(), 'kimi_page_dump.html');
        fs.writeFileSync(htmlFile, html);
        console.log(`Page HTML dumped to: ${htmlFile}`);
        
        console.log('Keeping browser open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);
        
    } else {
        console.error('❌ Login failed or timed out.');
        throw new Error('Login failed.');
    }
    
  } catch (e) {
      console.error('❌ Verification failed:', e);
  } finally {
      console.log('Closing browser...');
      await browserManager.close();
  }
}

verifyKimiMonitor();

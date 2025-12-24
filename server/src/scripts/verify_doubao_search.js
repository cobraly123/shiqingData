
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars FIRST, before other imports to handle hoisting of config values
const serverEnvPath = path.resolve(process.cwd(), 'server/.env');
if (fs.existsSync(serverEnvPath)) {
    console.log(`Loading .env from ${serverEnvPath}`);
    dotenv.config({ path: serverEnvPath });
} else {
    console.log('Loading .env from default location');
    dotenv.config();
}

async function verifyDoubaoSearch() {
    // Dynamic imports to ensure process.env is populated before config is read
    const { browserManager } = await import('../automation/core/BrowserManager.js');
    const { DoubaoPage } = await import('../automation/pages/DoubaoPage.js');
    const { config } = await import('../automation/config/config.js');

    try {
        console.log('Starting Doubao verification...');
        await browserManager.initialize({ headless: false });
        
        const context = await browserManager.newContext();
        const page = await context.newPage();
        
        const doubaoPage = new DoubaoPage(page);
        
        console.log('Navigating to Doubao...');
        await doubaoPage.navigate();
        
        // Handle Login
        const isLoggedIn = await doubaoPage.handleLogin();
        if (!isLoggedIn) {
            console.error('Failed to log in to Doubao.');
            // Dump screenshot
            await page.screenshot({ path: 'doubao_login_fail.png' });
            return;
        }
        
        console.log('Logged in successfully. Sending query...');
        
        // Send query that triggers search
        const query = '详细介绍一下北京故宫的历史文化，包括其建筑特色和重要历史事件，需要引用可靠来源。';
        await doubaoPage.sendQuery(query);
        
        console.log('Query sent. Waiting for response...');
        
        // Wait for response selector
        try {
            await page.waitForSelector(config.models.doubao.selectors.response, { timeout: 30000 });
        } catch (e) {
            console.log('Timeout waiting for response selector.');
        }
        
        // Wait for text to stabilize
        let lastLength = 0;
        let stableCount = 0;
        const maxRetries = 120; // Extended to 120 seconds
        
        for (let i = 0; i < maxRetries; i++) {
            if (page.isClosed()) {
                console.log('Page closed by user.');
                break;
            }

            const result = await doubaoPage.extractResponse();
            if (result && result.text) {
                const currentLength = result.text.length;
                console.log(`Response length: ${currentLength}`);
                
                // Check if we have search results or references
                const hasSources = result.searchResults.length > 0 || result.references.length > 0;
                
                if (currentLength > 0 && currentLength === lastLength) {
                    stableCount++;
                    // If we have sources, we can be more confident in stability (5s)
                    // If we don't have sources yet, wait longer (15s) in case they are loading
                    const requiredStability = hasSources ? 5 : 15;
                    
                    if (stableCount >= requiredStability) {
                    console.log(`Response stabilized (Stability count: ${stableCount}/${requiredStability}).`);
                    break;
                }
                } else {
                    stableCount = 0;
                }
                lastLength = currentLength;
            }
            await page.waitForTimeout(1000);
        }
        
        if (!page.isClosed()) {
            const result = await doubaoPage.extractResponse();
            
            console.log('--- Extraction Results ---');
            console.log('Text length:', result ? result.text.length : 0);
            if (result) {
                console.log('Text preview:', result.text.substring(0, 500));
                console.log('Search Results:', JSON.stringify(result.searchResults, null, 2));
                console.log('References:', JSON.stringify(result.references, null, 2));
                
                if (result.searchResults.length === 0 && result.references.length === 0) {
                    console.warn('No search results or references found. Dumping FULL HTML for inspection...');
                    const fullHtml = await page.content();
                    fs.writeFileSync('doubao_full_page.html', fullHtml);
                    await page.screenshot({ path: 'doubao_full_page.png', fullPage: true });
                } else {
                    console.log('Verification Passed: Found search results/references.');
                    // ALWAYS dump HTML for analysis of the side panel structure
                    console.log('Dumping HTML for side panel analysis...');
                    const fullHtml = await page.content();
                    fs.writeFileSync('doubao_side_panel.html', fullHtml);
                }
            } else {
                console.error('Failed to extract response.');
            }
        }

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await browserManager.close();
    }
}

verifyDoubaoSearch();


import { browserManager } from '../automation/core/BrowserManager.js';
import { DeepseekPage } from '../automation/pages/DeepSeekPage.js';
import { config } from '../automation/config/config.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });

async function verifyDeepseekSearch() {
    try {
        console.log('Starting Deepseek verification...');
        await browserManager.initialize({ headless: false });
        
        const context = await browserManager.newContext();
        const page = await context.newPage();
        
        const deepseekPage = new DeepseekPage(page);
        
        console.log('Navigating to Deepseek...');
        await deepseekPage.navigate();
        
        // Handle Login
        const isLoggedIn = await deepseekPage.handleLogin();
        if (!isLoggedIn) {
            console.error('Failed to log in to Deepseek.');
            // Dump screenshot
            await page.screenshot({ path: 'deepseek_login_fail.png' });
            return;
        }
        
        console.log('Logged in successfully. Sending query...');
        
        // Send query that triggers search
        const query = '详细介绍一下北京故宫的历史文化，包括其建筑特色和重要历史事件，需要引用可靠来源。';
        await deepseekPage.sendQuery(query);
        
        console.log('Query sent. Waiting for response...');
        
        // Wait for response and extract (using waitForResponse for stability)
        const result = await deepseekPage.waitForResponse();
        
        console.log('--- Extraction Results ---');
        console.log('Text length:', result.text.length);
        console.log('Text preview:', result.text.substring(0, 500));
        console.log('Search Results:', JSON.stringify(result.searchResults, null, 2));
        console.log('References:', JSON.stringify(result.references, null, 2));

        if (result.text.includes('资料来源')) {
            const index = result.rawHtml.indexOf('资料来源');
            if (index !== -1) {
                console.log('--- Raw HTML around "资料来源" ---');
                console.log(result.rawHtml.substring(index, index + 1000));
            }
        }
        
        if (result.searchResults.length === 0 && result.references.length === 0) {
            console.warn('No search results or references found. Dumping FULL HTML for inspection...');
            const fullHtml = await page.content();
            fs.writeFileSync('deepseek_full_page.html', fullHtml);
            // Take screenshot
            await page.screenshot({ path: 'deepseek_full_page.png', fullPage: true });
        } else {
            console.log('Verification Passed: Found search results/references.');
        }

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        await browserManager.close();
    }
}

verifyDeepseekSearch();

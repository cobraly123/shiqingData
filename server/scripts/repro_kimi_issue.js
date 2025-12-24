
import { KimiPage } from '../src/automation/pages/KimiPage.js';
import { BrowserManager } from '../src/automation/core/BrowserManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function reproduceIssue() {
    const browserManager = new BrowserManager();
    // Initialize first
    await browserManager.initialize({ headless: false }); // Use headed mode to see what's happening
    const context = await browserManager.newContext();
    const page = await context.newPage();

    const kimi = new KimiPage(page);
    
    try {
        console.log('Navigating to Kimi...');
        await kimi.navigate();
        
        // Wait for manual login if needed, or assume cookies are set
        // For reproduction, we might need a headed mode to confirm login
        // But let's try assuming the existing session works or we wait for login
        const loggedIn = await kimi.handleLogin();
        if (!loggedIn) {
            console.error('Login failed or timed out.');
            return;
        }

        const query = "根据最新的智能穿戴设备评测或榜单，哪些品牌在可穿戴健康设备维度表现最稳？";
        console.log(`Sending query: ${query}`);
        
        await kimi.sendQuery(query);
        console.log('Waiting for response...');
        
        // Use a longer timeout for deep research or long answers
        const result = await kimi.waitForResponse(60000); 

        if (result) {
            console.log('\n--- Extracted Text ---');
            console.log(result.text);
            console.log('----------------------\n');
            
            console.log('--- Raw HTML Dump ---');
            const debugPath = path.resolve(__dirname, 'kimi_repro_debug.html');
            fs.writeFileSync(debugPath, result.rawHtml || '');
            console.log(`Saved raw HTML to ${debugPath}`);
        } else {
            console.error('No result extracted.');
        }

    } catch (e) {
        console.error('Error during reproduction:', e);
    } finally {
        await browserManager.close();
    }
}

reproduceIssue();

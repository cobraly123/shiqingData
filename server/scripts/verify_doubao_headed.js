
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env:', result.error);
}
console.log('DOUBAO_COOKIES length:', process.env.DOUBAO_COOKIES ? process.env.DOUBAO_COOKIES.length : 0);


async function verifyDoubaoHeaded() {
    // Dynamic import to ensure process.env is populated before config.js is evaluated
    const { DoubaoPage } = await import('../src/automation/pages/DoubaoPage.js');
    const { BrowserManager } = await import('../src/automation/core/BrowserManager.js');

    const browserManager = new BrowserManager();
    // 1. Initialize browser in HEADED mode
    await browserManager.initialize({ headless: false });
    const context = await browserManager.newContext();
    const page = await context.newPage();

    const doubao = new DoubaoPage(page);
    
    try {
        console.log('Navigating to Doubao...');
        await doubao.navigate();
        
        // 2. Handle Login
        console.log('Checking login status...');
        const loggedIn = await doubao.handleLogin();
        if (!loggedIn) {
            console.error('Login failed or timed out. Please login manually in the window.');
            // Give user time to login if automated check fails
            await page.waitForTimeout(300000); // Wait up to 5 mins for manual login if needed
        } else {
            console.log('Login successful!');
        }

        // 3. Send Query
        const query = "介绍一下DeepSeek R1模型";
        console.log(`Sending query: ${query}`);
        
        await doubao.sendQuery(query);
        console.log('Waiting for response...');
        
        // 4. Extract Response
        const result = await doubao.waitForResponse(60000);

        if (result) {
            console.log('\n--- Extracted Text ---');
            console.log(result.text);
            console.log('----------------------\n');
            
            console.log('\n--- References ---');
            if (result.formattedReferences) {
                result.formattedReferences.forEach(ref => {
                    console.log(`[${ref['序号']}] ${ref['信源域名']} - ${ref['信源文章名']} (${ref['信源URL']})`);
                });
            }
             console.log('------------------\n');

            console.log('--- Raw HTML Dump ---');
            const debugPath = path.resolve(__dirname, 'doubao_headed_debug.html');
            fs.writeFileSync(debugPath, result.rawHtml || '');
            console.log(`Saved raw HTML to ${debugPath}`);
        } else {
            console.error('No result extracted.');
        }

    } catch (e) {
        console.error('Error during verification:', e);
    } finally {
        console.log('Closing browser in 10 seconds...');
        await page.waitForTimeout(10000);
        await browserManager.close();
    }
}

verifyDoubaoHeaded();

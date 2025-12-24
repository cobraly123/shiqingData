
import { KimiPage } from '../src/automation/pages/KimiPage.js';
import { WenxinPage } from '../src/automation/pages/WenxinPage.js';
import { DoubaoPage } from '../src/automation/pages/DoubaoPage.js';
import { QwenPage } from '../src/automation/pages/QwenPage.js';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

// Configuration
const HEADLESS = false; // As requested: non-headless verification
const TIMEOUT = 300000; // 5 minutes

async function verifyPlatform(PlatformClass, platformName) {
    console.log(`\n\n=== Verifying ${platformName} ===`);
    let browser = null;
    try {
        browser = await chromium.launch({
            headless: HEADLESS,
            args: ['--start-maximized'] // Helps with side panel visibility
        });
        const context = await browser.newContext({
            viewport: null
        });
        
        // Load cookies if available
        const cookiePath = path.resolve(`./cookies/${platformName}.json`);
        if (fs.existsSync(cookiePath)) {
            const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
            await context.addCookies(cookies);
            console.log(`Loaded cookies for ${platformName}`);
        }

        const page = await context.newPage();
        const instance = new PlatformClass(page);
        
        // 1. Login Check
        console.log('Checking login status...');
        const isLoggedIn = await instance.handleLogin();
        if (!isLoggedIn) {
            console.error(`❌ Failed to login to ${platformName}. Skipping test.`);
            return;
        }
        console.log('✅ Login successful');

        // 2. Send Query
        const query = "DeepSeek R1的技术特点"; // A query likely to trigger search/references
        console.log(`Sending query: "${query}"...`);
        await instance.sendQuery(query);

        // 3. Wait for Response
        console.log('Waiting for response...');
        const result = await instance.waitForResponse(TIMEOUT);

        if (!result) {
            console.error('❌ No response returned.');
            return;
        }

        // 4. Verify Data Structure
        console.log('✅ Response received. Verifying data structure...');
        
        // Check Text
        if (result.text && result.text.length > 0) {
            console.log(`- Text extracted (${result.text.length} chars)`);
        } else {
            console.warn('- ⚠️ Text is empty');
        }

        // Check Formatted References (The key requirement)
        if (result.formattedReferences && Array.isArray(result.formattedReferences)) {
            console.log(`- Found ${result.formattedReferences.length} references (Formatted)`);
            if (result.formattedReferences.length > 0) {
                const sample = result.formattedReferences[0];
                const requiredKeys = ['序号', '信源域名', '信源文章名', '信源URL'];
                const missingKeys = requiredKeys.filter(k => !(k in sample));
                
                if (missingKeys.length === 0) {
                    console.log('  ✅ Data structure matches requirement: { 序号, 信源域名, 信源文章名, 信源URL }');
                    console.table(result.formattedReferences.slice(0, 3)); // Show first 3
                } else {
                    console.error(`  ❌ Missing keys in formatted references: ${missingKeys.join(', ')}`);
                    console.log('Sample:', sample);
                }
            } else {
                console.warn('  ⚠️ No references found for this query. Try a more factual query.');
            }
        } else {
            console.error('❌ formattedReferences field is missing!');
        }

        // Check Formatted Search Results
        if (result.formattedSearchResults && Array.isArray(result.formattedSearchResults)) {
             console.log(`- Found ${result.formattedSearchResults.length} search results (Formatted)`);
        }

    } catch (error) {
        console.error(`❌ Error verifying ${platformName}:`, error);
    } finally {
        if (browser) await browser.close();
    }
}

async function run() {
    // You can uncomment specific platforms to test individually
    await verifyPlatform(KimiPage, 'kimi');
    await verifyPlatform(WenxinPage, 'wenxin');
    await verifyPlatform(DoubaoPage, 'doubao');
    await verifyPlatform(QwenPage, 'qwen');
}

run();

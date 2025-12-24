
import { browserManager } from '../automation/core/BrowserManager.js';
import { DeepseekPage } from '../automation/pages/DeepSeekPage.js';
import { SessionManager } from '../automation/core/SessionManager.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import readline from 'readline';

// Load env vars
dotenv.config();
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askUser(question) {
    return new Promise(resolve => {
        rl.question(question, answer => {
            resolve(answer);
        });
    });
}

async function verifyDeepseekInteractive() {
    try {
        console.log('Starting Deepseek Interactive Verification...');
        await browserManager.initialize({ headless: false });
        
        const sessionManager = new SessionManager();
        const modelKey = 'deepseek';
        
        console.log('Attempting to load saved session...');
        const sessionState = await sessionManager.loadSession(modelKey);
        
        const context = await browserManager.newContext(sessionState ? { storageState: sessionState } : {});
        const page = await context.newPage();
        
        const deepseekPage = new DeepseekPage(page);
        
        console.log('Navigating to Deepseek...');
        await deepseekPage.navigate();
        
        // Handle Login
        const isLoggedIn = await deepseekPage.handleLogin();
        if (!isLoggedIn) {
            console.error('Failed to log in to Deepseek.');
            return;
        }
        
        console.log('Logged in successfully. Sending query...');
        
        const query = '详细介绍一下DeepSeek R1模型的特点，需要引用可靠来源。';
        await deepseekPage.sendQuery(query);
        
        console.log('Query sent. Waiting for response...');
        await deepseekPage.waitForResponse(120000);
        
        console.log('\n==================================================');
        console.log('Please go to the browser window.');
        console.log('1. Verify the response has generated.');
        console.log('2. Click the "X References" (e.g. "已阅读 X 个网页") button to open the side panel.');
        console.log('3. Ensure the side panel with the list of sources is visible.');
        console.log('==================================================\n');
        
        await askUser('Press Enter in this terminal after you have opened the side panel...');
        
        console.log('Capturing DOM state...');
        
        // 1. Dump HTML
        const html = await page.content();
        fs.writeFileSync('deepseek_interactive_dump.html', html);
        console.log('HTML saved to deepseek_interactive_dump.html');
        
        // 2. Extract References
        console.log('Extracting references from the side panel...');
        
        const sources = await page.evaluate(() => {
            const results = [];
            // Strategy: Find all links that look like external sources
            // The side panel usually has a class like "ds-sidebar" or appears in a drawer.
            // But we will search globally for the structure of source items.
            
            const allLinks = Array.from(document.querySelectorAll('a[target="_blank"]'));
            
            allLinks.forEach((link, i) => {
                if (link.offsetParent === null) return; // Skip hidden
                
                const container = link.closest('div'); 
                if (!container) return;
                
                // Heuristic: Side panel items usually have a specific structure
                // Source Name (often with favicon)
                // Title (Link)
                // Snippet
                
                // Let's traverse up to find a "card"
                let card = container;
                let foundCard = false;
                // Go up a few levels
                for (let j=0; j<6; j++) {
                    if (card && card.parentElement) {
                        const text = card.innerText;
                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                        
                        // Heuristic: A source card usually has 2-4 lines of text
                        // And the link text is one of them
                        if (lines.length >= 2 && lines.length < 10) {
                            foundCard = true;
                            break;
                        }
                        card = card.parentElement;
                    }
                }
                
                if (foundCard) {
                    const lines = card.innerText.split('\n').map(l => l.trim()).filter(l => l);
                    
                    // Filter out the main response links (which usually don't have this card structure or are inside a table)
                    if (card.closest('table')) return;
                    
                    // Logic to identify parts
                    const title = link.innerText.trim();
                    let sourceName = lines[0];
                    
                    // If the first line is the title, maybe source name is missing or elsewhere
                    if (sourceName === title && lines.length > 1) sourceName = lines[1];
                    
                    // Clean source name
                    sourceName = sourceName.replace(/\d+.*ago/, '').trim();
                    
                    // Avoid duplicates
                    if (!results.find(r => r.url === link.href)) {
                        results.push({
                            index: results.length + 1,
                            sourceName: sourceName,
                            title: title,
                            url: link.href,
                            raw: lines.join('|')
                        });
                    }
                }
            });
            
            return results;
        });
        
        console.log(`Found ${sources.length} potential sources.`);
        console.log(JSON.stringify(sources, null, 2));
        
        console.log('\n--- Analysis ---');
        if (sources.length > 0) {
            console.log('Success! We extracted sources from the side panel.');
        } else {
            console.log('Failed to extract sources. Please check the HTML dump.');
        }

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        rl.close();
        // Wait a bit before closing
        await new Promise(r => setTimeout(r, 5000));
        await browserManager.close();
    }
}

verifyDeepseekInteractive();

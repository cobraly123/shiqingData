
import { browserManager } from '../automation/core/BrowserManager.js';
import { DeepseekPage } from '../automation/pages/DeepSeekPage.js';
import { SessionManager } from '../automation/core/SessionManager.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });

async function verifyDeepseekClass() {
    try {
        console.log('Starting Deepseek Class Integration Verification...');
        // Force headless false for visual check
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
        
        console.log('Logged in successfully. Saving session...');
        await sessionManager.saveSession(modelKey, context);
        
        // Send query
        const query = '详细介绍一下DeepSeek R1模型的特点，需要引用可靠来源。';
        console.log(`Sending query: ${query}`);
        await deepseekPage.sendQuery(query);
        
        console.log('Query sent. Calling waitForResponse() which should now handle side panel extraction...');
        
        const response = await deepseekPage.waitForResponse(120000);
        
        console.log('Response received.');
        console.log('Text Length:', response.text?.length);
        console.log('References Found:', response.references?.length);
        
        if (response.references && response.references.length > 0) {
            console.log('First 3 References:');
            console.log(JSON.stringify(response.references.slice(0, 3), null, 2));
        } else {
            console.log('No references found in the result object.');
        }

        console.log('Closing browser in 5s...');
        await new Promise(r => setTimeout(r, 5000));
        await browserManager.close();
        
    } catch (e) {
        console.error('Error in verification:', e);
        await browserManager.close();
    }
}

verifyDeepseekClass();

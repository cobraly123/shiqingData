import 'dotenv/config';
import { QueryEngine } from './automation/core/QueryEngine.js';
import { browserManager } from './automation/core/BrowserManager.js';

async function testKimi() {
  console.log('Starting Kimi Test...');
  
  // Initialize browser with headless: false explicitly
  await browserManager.initialize({ headless: false });
  
  const engine = new QueryEngine();
  
  try {
    // Just run a simple query. The engine handles login.
    const result = await engine.runQuery('kimi', '电池在高温环境下充电，有哪些主动安全防护机制？');
    console.log('Test Result:', JSON.stringify(result, null, 2));

    // Save full HTML for debugging
    const fs = await import('fs');
    if (engine.sessionManager && engine.sessionManager.pages && engine.sessionManager.pages.length > 0) {
        // This path is tricky because QueryEngine manages the page internally and closes/doesn't expose it easily unless we modify QueryEngine
        // But we are using the engine instance. The engine doesn't expose the page directly in the return value.
        // However, I can modify QueryEngine to expose the page or just trust my analysis.
    }
  } catch (e) {
    console.error('Test Failed:', e);
  }
  
  // Keep browser open for a moment to see
  console.log('Keeping browser open for 10 seconds...');
  await new Promise(r => setTimeout(r, 10000));
  process.exit(0);
}

testKimi();

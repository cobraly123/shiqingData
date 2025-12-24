import 'dotenv/config';
import { browserManager } from './automation/core/BrowserManager.js';
import { QwenPage } from './automation/pages/QwenPage.js';
import { KimiPage } from './automation/pages/KimiPage.js';
import { DoubaoPage } from './automation/pages/DoubaoPage.js';
import { DeepseekPage } from './automation/pages/DeepseekPage.js';
import { WenxinPage } from './automation/pages/WenxinPage.js';

async function verifySources() {
  console.log('Starting Source Extraction Verification for 5 Platforms...');
  
  // Models to test
  const models = [
    { key: 'kimi', Class: KimiPage, name: 'Kimi' },
    // { key: 'doubao', Class: DoubaoPage, name: 'Doubao' },
    // { key: 'deepseek', Class: DeepseekPage, name: 'Deepseek' },
    // { key: 'wenxin', Class: WenxinPage, name: 'Wenxin' },
    // { key: 'qwen', Class: QwenPage, name: 'Qwen' }
  ];

  // Initialize Browser (Headless: false for visibility)
  await browserManager.initialize({ headless: false });
  const context = await browserManager.newContext();

  const results = {};

  for (const model of models) {
    console.log(`\n----------------------------------------`);
    console.log(`Testing Model: ${model.name}`);
    console.log(`----------------------------------------`);

    try {
      const page = await context.newPage();
      const modelPage = new model.Class(page);
      
      // 1. Navigate
      await modelPage.navigate();
      
      // 2. Login
      const loggedIn = await modelPage.handleLogin();
      if (!loggedIn) {
        console.warn(`[SKIP] Could not log in to ${model.name}. Skipping test.`);
        await page.close();
        results[model.name] = { status: 'skipped', reason: 'Login failed' };
        continue;
      }

      // 3. Send Query
      // Use a query that triggers search/citations
      const query = "根据最新的智能穿戴评测或榜单，哪些品牌在可穿戴设备维度表现最稳？请列出参考来源。";
      console.log(`Sending Query: "${query}"`);
      await modelPage.sendQuery(query);

      // 4. Wait for Response
      console.log('Waiting for response...');
      const response = await modelPage.waitForResponse();
      
      // Save HTML for debugging
      if (response && response.rawHtml) {
          const fs = await import('fs');
          const path = await import('path');
          const debugFile = path.resolve(process.cwd(), `debug_response_${model.key}.html`);
          fs.writeFileSync(debugFile, response.rawHtml);
          console.log(`Saved raw HTML to ${debugFile}`);
      }

      // 5. Check Sources
      if (response && response.sources && response.sources.length > 0) {
        console.log(`\n[SUCCESS] Extracted ${response.sources.length} sources from ${model.name}:`);
        response.sources.forEach((s, i) => {
            console.log(`  ${i+1}. [${s.title}] ${s.url}`);
        });
        results[model.name] = { 
            status: 'success', 
            count: response.sources.length, 
            sources: response.sources 
        };
      } else {
        console.log(`\n[WARNING] No sources extracted from ${model.name}.`);
        console.log('Response text preview:', response ? response.text.substring(0, 100) + '...' : 'null');
        results[model.name] = { status: 'failed', reason: 'No sources found' };
      }

      // Wait a bit before closing
      await page.waitForTimeout(2000);
      await page.close();

    } catch (err) {
      console.error(`[ERROR] Test failed for ${model.name}:`, err);
      results[model.name] = { status: 'error', error: err.message };
    }
  }

  console.log('\n========================================');
  console.log('Verification Summary');
  console.log('========================================');
  console.table(Object.entries(results).map(([name, res]) => ({
    Model: name,
    Status: res.status,
    Sources: res.count || 0,
    Note: res.reason || res.error || ''
  })));

  await browserManager.close();
}

verifySources().catch(console.error);

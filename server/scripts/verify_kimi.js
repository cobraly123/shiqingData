import 'dotenv/config';
import { QueryEngine } from '../src/automation/core/QueryEngine.js';
import { browserManager } from '../src/automation/core/BrowserManager.js';
import fs from 'fs';

async function verifyKimi() {
  const isHeadless = false; // Force non-headless to see the popup
  console.log('--- Verifying Kimi Popup Handling (Headless: false) ---');

  // Clean up existing sessions to force login flow
  const sessionDir = 'data/sessions';
  if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      for (const file of files) {
          if (file.includes('kimi')) {
              console.log(`Deleting existing session: ${file}`);
              fs.unlinkSync(`${sessionDir}/${file}`);
          }
      }
  }

  await browserManager.initialize({ headless: isHeadless });
  const engine = new QueryEngine();
  
  const query = "你好，请确认你是否已登录并可以正常对话。";
  const model = 'kimi';

  try {
      console.log(`\nTesting Model: ${model}`);
      const result = await engine.runQuery(model, query);
      
      if (result.status === 'success') {
        const responseText = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
        console.log(`✅ ${model} Auto-Login & Query Successful!`);
        console.log('Response preview:', responseText.substring(0, 100) + '...');
      } else {
        console.error(`❌ ${model} Failed:`, result.error);
      }
  } catch (e) {
      console.error(`❌ ${model} Exception:`, e);
  }

  // Keep browser open for a bit to observe
  console.log('Waiting 30s before closing to allow observation...');
  await new Promise(r => setTimeout(r, 30000));

  await browserManager.close();
  console.log('\n--- Verification Complete ---');
}

verifyKimi();

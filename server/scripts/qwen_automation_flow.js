import 'dotenv/config'; // Load environment variables first
import { QueryEngine } from '../src/automation/core/QueryEngine.js';
import { StorageService } from '../src/automation/core/StorageService.js';
import { browserManager } from '../src/automation/core/BrowserManager.js';

async function runQwenAutomation() {
  console.log('--- Starting Qwen Automation Flow ---');

  // 1. Initialization
  const storage = new StorageService({ baseDir: 'data/qwen_results' });
  const engine = new QueryEngine();
  
  // Explicitly check for credentials if running headless
  if (process.env.HEADLESS !== 'false' && (!process.env.QWEN_USERNAME || !process.env.QWEN_PASSWORD)) {
      console.warn('WARNING: Running headless without credentials. Login will likely fail.');
  }

  await browserManager.initialize();

  // 2. Define Tasks (Queries)
  const queries = [
    "如何使用Python进行数据分析？请列出常用库。",
    "Explain the theory of relativity briefly."
  ];

  try {
    for (const query of queries) {
      console.log(`\nProcessing Query: "${query}"`);
      
      // 3. Execute Query via Engine (which handles Page Object lifecycle)
      const result = await engine.runQuery('qwen', query);

      if (result.status === 'success') {
        // 4. Data Processing & Storage
        const record = {
            model: 'qwen',
            query: result.query,
            response: result.response.text,
            sources: result.response.sources,
            raw_html: result.response.rawHtml, // Optional: save raw HTML for debugging
            metrics: result.metrics
        };
        
        await storage.save(record);
        console.log('Result saved successfully.');
      } else {
        console.error('Query execution failed:', result.error);
      }

      // 5. Rate Limiting / Delays
      const delay = Math.floor(Math.random() * 5000) + 2000; // 2-7 seconds delay
      console.log(`Waiting ${delay}ms before next query...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

  } catch (fatalError) {
    console.error('Fatal Automation Error:', fatalError);
  } finally {
    // 6. Cleanup
    console.log('Closing browser session...');
    await browserManager.close();
    console.log('--- Automation Finished ---');
  }
}

runQwenAutomation();

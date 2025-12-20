import { browserManager } from '../src/automation/core/BrowserManager.js';
import { QueryEngine } from '../src/automation/core/QueryEngine.js';
import { StorageService } from '../src/automation/core/StorageService.js';

async function verifyWenxin() {
  console.log('--- Starting Wenxin Verification ---');
  
  const storage = new StorageService({ baseDir: 'data/verification_results' });
  const engine = new QueryEngine();

  // Initialize browser (headless: false so we can see what happens)
  await browserManager.initialize({ headless: false });

  const model = 'wenxin';
  const query = "请简要介绍一下你自己。";

  try {
      console.log(`\n=== Testing Model: ${model} ===`);
      console.log(`Processing Query: "${query}"`);
      
      // Run Query
      const result = await engine.runQuery(model, query);
      
      // Process Result
      if (result.status === 'success') {
          console.log('Query successful!');
          console.log('Response length:', result.response.text ? result.response.text.length : result.response.length);
          console.log('Response preview:', (result.response.text || result.response).substring(0, 100) + '...');
          
          const record = {
              model: model,
              query: result.query,
              response: result.response.text || result.response,
              sources: result.response.sources || [],
              timestamp: new Date().toISOString()
          };

          await storage.save(record);
          console.log(`Result saved.`);
      } else {
          console.error(`Query execution failed for ${model}:`, result.error);
      }

  } catch (error) {
      console.error('Verification encountered a critical error:', error);
  } finally {
      // Keep browser open for a moment to inspect if needed, or close it
      console.log('Closing browser session in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await browserManager.close();
      console.log('--- Verification Finished ---');
  }
}

verifyWenxin();

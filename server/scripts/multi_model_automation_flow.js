import { browserManager } from '../src/automation/core/BrowserManager.js';
import { QueryEngine } from '../src/automation/core/QueryEngine.js';
import { StorageService } from '../src/automation/core/StorageService.js';
import { Monitor } from '../src/automation/core/Monitor.js';

async function runMultiModelAutomation() {
  console.log('--- Starting Multi-Model Automation Flow ---');
  
  const storage = new StorageService({ baseDir: 'data/multimodel_results' });
  const engine = new QueryEngine();
  const monitor = new Monitor();

  // Initialize browser (headless: false for visual debugging/login)
  await browserManager.initialize({ headless: false });

  // List of models to test
  // 'qwen' is already tested, adding others.
  // You can comment/uncomment models as needed.
  const models = [
      'qwen', 
      'wenxin', 
      'deepseek', 
      'kimi', 
      'doubao'
  ];

  const queries = [
    "请简要介绍一下你自己。"
  ];

  try {
      for (const model of models) {
          console.log(`\n=== Processing Model: ${model} ===`);
          
          for (const query of queries) {
            console.log(`\nProcessing Query: "${query}"`);
            
            // Run Query
            const result = await engine.runQuery(model, query);
            
            // Process Result
            if (result.status === 'success') {
                const record = {
                    model: model,
                    query: result.query,
                    response: result.response.text || result.response, // handle if text is direct string or object
                    sources: result.response.sources || [],
                    raw_html: result.response.rawHtml || '',
                    metrics: result.metrics,
                    timestamp: new Date().toISOString()
                };

                // Save to Storage
                await storage.save(record);
                console.log(`Result saved for ${model}.`);
                monitor.record(result);
            } else {
                console.error(`Query execution failed for ${model}:`, result.error);
                monitor.record(result);
            }

            // Rate Limiting / Random Delay
            const delay = Math.floor(Math.random() * 5000) + 2000;
            console.log(`Waiting ${delay}ms before next query...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
      }
  } catch (error) {
      console.error('Automation flow encountered a critical error:', error);
  } finally {
      console.log('Closing browser session...');
      await browserManager.close();
      console.log('--- Automation Finished ---');
  }
}

runMultiModelAutomation();

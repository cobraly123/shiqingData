import { QueryEngine } from '../src/automation/core/QueryEngine.js';
import { ResultProcessor } from '../src/automation/core/ResultProcessor.js';
import { Monitor } from '../src/automation/core/Monitor.js';
import { browserManager } from '../src/automation/core/BrowserManager.js';

async function runFrameworkDemo() {
  console.log('Starting Automation Framework Demo...');

  const queryEngine = new QueryEngine();
  const processor = new ResultProcessor();
  const monitor = new Monitor();

  // Initialize Browser
  await browserManager.initialize();

  // Test Queries
  const tasks = [
    { model: 'qwen', query: '你好，请介绍一下你自己。' },
    // Add other models here when ready
  ];

  for (const task of tasks) {
    console.log(`Executing task: Model=${task.model}, Query="${task.query}"`);
    
    // 1. Run Query
    const rawResult = await queryEngine.runQuery(task.model, task.query);
    
    // 2. Process Result
    const processedResult = processor.process(rawResult);
    
    // 3. Monitor/Record
    monitor.record(rawResult);

    console.log('Result:', JSON.stringify(processedResult, null, 2));
  }

  // Final Report
  console.log('Final Report:', monitor.getReport());

  // Cleanup
  await browserManager.close();
}

runFrameworkDemo();

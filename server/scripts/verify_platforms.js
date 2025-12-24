import 'dotenv/config';
import { QueryEngine } from '../src/automation/core/QueryEngine.js';
import { browserManager } from '../src/automation/core/BrowserManager.js';
import fs from 'fs';

async function verifyPlatform(model) {
  console.log(`\n--- Verifying ${model} Integration (Headless: false) ---`);

  // Do NOT delete sessions by default to test persistence
  // const sessionDir = 'data/sessions';
  
  const engine = new QueryEngine();
  
  const query = "介绍一下DeepSeek R1"; // Standard query that usually triggers search

  try {
      console.log(`\nTesting Model: ${model}`);
      const result = await engine.runQuery(model, query);
      
      if (result.status === 'success') {
        const responseText = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
        console.log(`✅ ${model} Query Successful!`);
        console.log('Response preview:', responseText.substring(0, 100) + '...');
        
        const extractedData = result.response || {};
        
        if (extractedData.formattedSearchResults && extractedData.formattedSearchResults.length > 0) {
            console.log('\n--- Extracted Search Results (Formatted) ---');
            console.log('序号 | 信源名称 | 信源文章名 | 信源URL');
            console.log('--- | --- | --- | ---');
            extractedData.formattedSearchResults.forEach((item) => {
                console.log(`${item['序号']} | ${item['信源域名']} | ${item['信源文章名']} | ${item['信源URL']}`);
            });
        } else {
            console.log('\nNo search results extracted.');
        }

        if (extractedData.formattedReferences && extractedData.formattedReferences.length > 0) {
            console.log('\n--- Extracted References (Formatted) ---');
            console.log('序号 | 信源名称 | 信源文章名 | 信源URL');
            console.log('--- | --- | --- | ---');
            extractedData.formattedReferences.forEach((item) => {
                console.log(`${item['序号']} | ${item['信源域名']} | ${item['信源文章名']} | ${item['信源URL']}`);
            });
        } else {
             console.log('\nNo references extracted. (This is normal if the query did not trigger citation)');
        }
        
        // --- Save to Readable Log File for Manual Inspection ---
        const logContent = [];
        logContent.push(`# ${model} Verification Results (${new Date().toLocaleString()})`);
        logContent.push(`Query: ${query}\n`);
        
        logContent.push(`## Response Text Preview`);
        logContent.push(responseText.substring(0, 500) + '...\n');

        logContent.push(`## Search Results (${(extractedData.formattedSearchResults || []).length})`);
        if (extractedData.formattedSearchResults && extractedData.formattedSearchResults.length > 0) {
            logContent.push('| 序号 | 信源名称 | 信源文章名 | 信源URL |');
            logContent.push('| --- | --- | --- | --- |');
            extractedData.formattedSearchResults.forEach((item) => {
                logContent.push(`| ${item['序号']} | ${item['信源域名']} | ${item['信源文章名']} | ${item['信源URL']} |`);
            });
            logContent.push('');
        } else {
            logContent.push('No search results found.\n');
        }

        logContent.push(`## References (${(extractedData.formattedReferences || []).length})`);
        if (extractedData.formattedReferences && extractedData.formattedReferences.length > 0) {
            logContent.push('| 序号 | 信源名称 | 信源文章名 | 信源URL |');
            logContent.push('| --- | --- | --- | --- |');
            extractedData.formattedReferences.forEach((item) => {
                logContent.push(`| ${item['序号']} | ${item['信源域名']} | ${item['信源文章名']} | ${item['信源URL']} |`);
            });
            logContent.push('');
        } else {
            logContent.push('No references found.\n');
        }

        const logPath = `${model}_verification_results.md`;
        fs.writeFileSync(logPath, logContent.join('\n'));
        console.log(`\n✅ Results saved to ${logPath} for manual inspection.`);
        
      } else {
        console.error(`❌ ${model} Failed:`, result.error);
      }
  } catch (e) {
      console.error(`❌ ${model} Exception:`, e);
  }
}

async function verifyAll() {
    const isHeadless = false;
    await browserManager.initialize({ headless: isHeadless });

    // Test sequentially
    await verifyPlatform('wenxin');
    await verifyPlatform('qwen');
    await verifyPlatform('doubao');

    console.log('\nWaiting 10s before closing...');
    await new Promise(r => setTimeout(r, 10000));
    await browserManager.close();
    console.log('--- All Verifications Complete ---');
}

verifyAll();

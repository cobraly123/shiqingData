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
  
  const query = "介绍一下DeepSeek R1";
  const model = 'kimi';

  try {
      console.log(`\nTesting Model: ${model}`);
      const result = await engine.runQuery(model, query);
      
      if (result.status === 'success') {
        const responseText = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
        console.log(`✅ ${model} Query Successful!`);
        console.log('Response preview:', responseText.substring(0, 100) + '...');
        
        // Log extracted search results and references
        // Note: result.response contains the extracted data
        const extractedData = result.response || {};
        
        if (extractedData.formattedSearchResults && extractedData.formattedSearchResults.length > 0) {
            console.log('\n--- Extracted Search Results (Formatted) ---');
            // console.log(JSON.stringify(extractedData.searchResults, null, 2));
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
            // console.log(JSON.stringify(extractedData.references, null, 2));
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
        logContent.push(`# Kimi Verification Results (${new Date().toLocaleString()})`);
        logContent.push(`Query: ${query}\n`);
        
        logContent.push(`## Response Text Preview`);
        logContent.push(responseText.substring(0, 500) + '...\n');

        logContent.push(`## Search Results (${(extractedData.searchResults || []).length})`);
        if (extractedData.searchResults && extractedData.searchResults.length > 0) {
            logContent.push('| 序号 | 信源名称 | 信源文章名 | 信源URL |');
            logContent.push('| --- | --- | --- | --- |');
            extractedData.searchResults.forEach((item, index) => {
                logContent.push(`| ${index + 1} | ${item.source || 'N/A'} | ${item.title || 'N/A'} | ${item.url || 'N/A'} |`);
            });
            logContent.push('');
        } else {
            logContent.push('No search results found.\n');
        }

        logContent.push(`## References (${(extractedData.references || []).length})`);
        if (extractedData.references && extractedData.references.length > 0) {
            logContent.push('| 序号 | 信源名称 | 信源文章名 | 信源URL |');
            logContent.push('| --- | --- | --- | --- |');
            extractedData.references.forEach((item, index) => {
                logContent.push(`| ${index + 1} | ${item.source || 'N/A'} | ${item.title || 'N/A'} | ${item.url || 'N/A'} |`);
            });
            logContent.push('');
        } else {
            logContent.push('No references found.\n');
        }

        const logPath = 'kimi_latest_results.md';
        fs.writeFileSync(logPath, logContent.join('\n'));
        console.log(`\n✅ Results saved to ${logPath} for manual inspection.`);
        
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

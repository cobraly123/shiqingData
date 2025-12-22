import 'dotenv/config';
import { QueryEngine } from '../src/automation/core/QueryEngine.js';
import { browserManager } from '../src/automation/core/BrowserManager.js';
import { config } from '../src/automation/config/config.js';
import fs from 'fs';

async function verifyAutoLogin() {
  const args = process.argv.slice(2);
  const targetModel = args[0];
  const allModels = Object.keys(config.models);
  const models = (targetModel && targetModel !== 'all') ? [targetModel] : allModels;
  const isHeadless = process.env.HEADLESS === 'true' || args.includes('--headless');
  const keepSession = args.includes('--keep-session');

  console.log(`--- Verifying Auto-Login for ${models.join(', ')} ---`);
  console.log(`Headless mode: ${isHeadless}`);
  
  // Clean up existing sessions to force auto-login via injection
  const sessionDir = 'data/sessions';
  if (fs.existsSync(sessionDir) && !keepSession) {
      const files = fs.readdirSync(sessionDir);
      for (const file of files) {
          const shouldDelete = models.some(m => file.includes(m));
          if (shouldDelete) {
              console.log(`Deleting existing session: ${file}`);
              fs.unlinkSync(`${sessionDir}/${file}`);
          }
      }
  } else if (keepSession) {
      console.log('Skipping session cleanup (--keep-session enabled).');
  }

  await browserManager.initialize({ headless: isHeadless });
  const engine = new QueryEngine();
  
  const query = "你好，请确认你是否已登录并可以正常对话。";
  
  // Setup output directory and file
  const outputDir = 'Verification_results';
  if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `${outputDir}/verification_results_${timestamp}.txt`;
  
  console.log(`Writing results to: ${reportPath}`);
  fs.appendFileSync(reportPath, `--- Verification Test Run: ${new Date().toISOString()} ---\n`);
  fs.appendFileSync(reportPath, `Headless Mode: ${isHeadless}\n`);
  fs.appendFileSync(reportPath, `Models Tested: ${models.join(', ')}\n\n`);

  for (const model of models) {
    console.log(`\nTesting Model: ${model}`);
    try {
      const result = await engine.runQuery(model, query);
      
      if (result.status === 'success') {
        const responseText = typeof result.response === 'string' ? result.response : JSON.stringify(result.response);
        console.log(`✅ ${model} Auto-Login & Query Successful!`);
        console.log('Response preview:', responseText.substring(0, 50) + '...');
        
        // Record full response
        const logEntry = `
Model: ${model}
Status: Success
Response:
${responseText}
--------------------------------------------------
`;
        fs.appendFileSync(reportPath, logEntry);
        
      } else {
        console.error(`❌ ${model} Failed:`, result.error);
        const logEntry = `
Model: ${model}
Status: Failed
Error: ${JSON.stringify(result.error)}
--------------------------------------------------
`;
        fs.appendFileSync(reportPath, logEntry);
      }
    } catch (e) {
      console.error(`❌ ${model} Exception:`, e);
       const logEntry = `
Model: ${model}
Status: Exception
Error: ${e.message}
--------------------------------------------------
`;
       fs.appendFileSync(reportPath, logEntry);
    }
  }

  await browserManager.close();
  console.log('\n--- Verification Complete ---');
}

verifyAutoLogin();


import { browserManager } from '../src/automation/core/BrowserManager.js';
import { QueryEngine } from '../src/automation/core/QueryEngine.js';
import { StorageService } from '../src/automation/core/StorageService.js';

async function verifyKimiWithToken() {
  console.log('--- Starting Kimi Verification with Token Injection ---');
  
  const storage = new StorageService({ baseDir: 'data/verification_results' });
  const engine = new QueryEngine();
  
  await browserManager.initialize({ headless: false });
  
  const model = 'kimi';
  const query = "请简要介绍一下你自己。";
  
  // Token provided by user
  const token = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc2ODcwNTQ0NiwiaWF0IjoxNzY2MTEzNDQ2LCJqdGkiOiJkNTJjMTltMDBxcjcxb2ZzbTVyMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJjbzEyaGk2Y3A3ZjgwM2xvdWVqZyIsInNwYWNlX2lkIjoiY28xMmhpNmNwN2Y4MDNsb3VlaWciLCJhYnN0cmFjdF91c2VyX2lkIjoiY28xMmhpNmNwN2Y4MDNsb3VlaTAiLCJzc2lkIjoiMTczMDEyMzMyNzc2MDI5MjgxMyIsImRldmljZV9pZCI6Ijc1NzIwNTkwNjExODE2ODgwNzIiLCJyZWdpb24iOiJjbiIsIm1lbWJlcnNoaXAiOnsibGV2ZWwiOjEwfX0.A5aiGV0c4QqjirnVOjLMLHF51-AyLHFbIn04Q4VDs-5TI4pqijNE8o4J3Rpkd3Riow6E5yCTQ4XairShG8MJ-w";
  
  try {
      // 1. Manually create context and page to inject token
      const context = await browserManager.browser.newContext();
      const page = await context.newPage();
      
      console.log('Navigating to Kimi domain to set storage...');
      await page.goto('https://www.kimi.com/');
      
      console.log('Injecting token into localStorage...');
      await page.evaluate((token) => {
          localStorage.setItem('access_token', token);
          localStorage.setItem('refresh_token', token); // Just in case
          // Also try to set cookie if needed, but usually localStorage is enough for Kimi
      }, token);
      
      console.log('Reloading page to apply token...');
      await page.reload();
      await page.waitForTimeout(5000); // Wait for app to load
      
      // 2. Run Query using the Engine (which might create a NEW context, so we need to be careful)
      // Actually, QueryEngine creates its own context. We should probably use the engine but modify it to accept an existing context 
      // OR just run the logic here manually since it's a verification script.
      
      console.log(`\n=== Testing Model: ${model} ===`);
      
      // Manual interaction logic
      const selectors = {
        input: 'div[contenteditable="true"]',
        submit: 'div[class*="send-button"], button[class*="send"]',
        response: 'div[class*="markdown"], div[class*="answer"], div[data-testid="msh-chat-bubble"], div[class*="chat-message"]'
      };
      
      // Input Query
      await page.waitForSelector(selectors.input);
      await page.fill(selectors.input, query);
      await page.waitForTimeout(1000);
      
      // Click Submit
      const submitBtn = await page.$(selectors.submit);
      if (submitBtn) {
          await submitBtn.click();
      } else {
          await page.keyboard.press('Enter');
      }
      
      console.log('Query sent. Waiting for response...');
      
      // Wait for response
      await page.waitForSelector(selectors.response, { timeout: 30000 });
      console.log('Response element detected!');
      
      // Wait for generation (simple wait)
      await page.waitForTimeout(10000);
      
      const responses = await page.$$(selectors.response);
      const lastResponse = responses[responses.length - 1];
      const text = await lastResponse.textContent();
      
      console.log('Response preview:', text.substring(0, 100) + '...');
      
      if (text.length > 0) {
           const record = {
              model: model,
              query: query,
              response: text,
              timestamp: new Date().toISOString()
          };
          await storage.save(record);
          console.log(`Result saved.`);
      }

  } catch (error) {
      console.error('Verification encountered a critical error:', error);
  } finally {
      console.log('Closing browser session in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await browserManager.close();
      console.log('--- Verification Finished ---');
  }
}

verifyKimiWithToken();

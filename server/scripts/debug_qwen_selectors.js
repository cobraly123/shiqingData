import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true }); // Headless is fine for dumping html
  const page = await browser.newPage();
  
  console.log('Navigating to Qwen...');
  await page.goto('https://tongyi.aliyun.com/qianwen/');
  
  console.log('Waiting for page load...');
  await page.waitForTimeout(5000); // Wait for dynamic content

  console.log('--- Page Title ---');
  console.log(await page.title());

  console.log('\n--- Buttons ---');
  const buttons = await page.$$('button, div[role="button"], a[href*="login"], div[class*="btn"]');
  for (const btn of buttons) {
      const text = await btn.innerText();
      const cls = await btn.getAttribute('class');
      if (text.trim().length > 0) {
          console.log(`Text: "${text.trim()}", Class: "${cls}"`);
      }
  }

  console.log('\n--- Links with "login" or "登录" ---');
  const links = await page.$$('a');
  for (const link of links) {
      const text = await link.innerText();
      const href = await link.getAttribute('href');
      if (text.includes('登录') || (href && href.includes('login'))) {
          console.log(`Text: "${text}", Href: "${href}"`);
      }
  }
  
  // Check for specific login elements mentioned in other configs
  const loginBtn = await page.$('.login-btn');
  if (loginBtn) console.log('Found .login-btn');
  
  await browser.close();
})();

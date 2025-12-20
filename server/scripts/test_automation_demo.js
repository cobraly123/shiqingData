import { ModelTestExecutor } from '../src/automation/executors/ModelTestExecutor.js';
import { ScreenshotService } from '../src/automation/collectors/ScreenshotService.js';
import { ReportGenerator } from '../src/automation/reporting/ReportGenerator.js';
import { browserManager } from '../src/automation/core/BrowserManager.js';

async function runPoc() {
  console.log('Starting Automation POC...');

  const executor = new ModelTestExecutor();
  const screenshotService = new ScreenshotService();
  const reportGen = new ReportGenerator();

  try {
    // 1. Setup
    await executor.setup();
    const page = executor.page;

    // 2. Navigate
    console.log('Navigating to http://localhost:5173');
    await page.goto('http://localhost:5173');

    // 3. Extract Title
    const title = await page.title();
    console.log('Page Title:', title);

    // 4. Take Screenshot
    console.log('Taking screenshot...');
    const screenshotPath = await screenshotService.takeScreenshot(page, 'poc-test', { fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);

    // 5. Generate Report
    const reportPath = reportGen.generateJsonReport({
      title,
      screenshot: screenshotPath,
      status: 'success'
    }, 'POC-Test');
    console.log('Report saved to:', reportPath);

  } catch (error) {
    console.error('POC Failed:', error);
  } finally {
    // 6. Cleanup
    await executor.teardown();
    await browserManager.close();
  }
}

runPoc();

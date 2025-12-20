import fs from 'fs';
import path from 'path';

export class ScreenshotService {
  constructor(storagePath = 'reports/screenshots') {
    this.storagePath = storagePath;
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async takeScreenshot(page, name, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${name}-${timestamp}.png`;
    const filePath = path.join(this.storagePath, fileName);

    await page.screenshot({
      path: filePath,
      fullPage: options.fullPage || false,
      clip: options.clip || undefined
    });

    return filePath;
  }

  async takeElementScreenshot(elementHandle, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${name}-element-${timestamp}.png`;
    const filePath = path.join(this.storagePath, fileName);

    await elementHandle.screenshot({ path: filePath });

    return filePath;
  }
}

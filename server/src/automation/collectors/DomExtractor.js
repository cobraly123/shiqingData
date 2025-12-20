export class DomExtractor {
  async extractText(page, selector) {
    try {
      return await page.textContent(selector);
    } catch (e) {
      console.error(`Failed to extract text from ${selector}:`, e);
      return null;
    }
  }

  async extractAttribute(page, selector, attribute) {
    try {
      return await page.getAttribute(selector, attribute);
    } catch (e) {
      console.error(`Failed to extract attribute ${attribute} from ${selector}:`, e);
      return null;
    }
  }

  async getPerformanceMetrics(page) {
    return await page.evaluate(() => JSON.stringify(window.performance.timing));
  }
}

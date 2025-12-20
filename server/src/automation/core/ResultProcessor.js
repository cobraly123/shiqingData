export class ResultProcessor {
  process(rawResult) {
    // Standardize structure
    const processed = {
      meta: {
        model: rawResult.model,
        timestamp: rawResult.metrics?.timestamp || new Date().toISOString(),
        duration_ms: rawResult.metrics?.duration || 0
      },
      input: {
        query: rawResult.query
      },
      output: {
        text: this.cleanText(rawResult.response),
        raw: rawResult.response,
        error: rawResult.error || null
      },
      status: rawResult.status
    };

    return processed;
  }

  cleanText(text) {
    if (!text) return '';
    // Remove extra whitespace, potential HTML tags if leaked, etc.
    return text.trim().replace(/\s+/g, ' ');
  }
}

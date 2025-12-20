import fs from 'fs';
import path from 'path';

export class StorageService {
  constructor(options = {}) {
    this.baseDir = options.baseDir || 'data/automation_results';
    this.format = options.format || 'jsonl'; // 'jsonl' or 'sqlite' (future)
    
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async save(data) {
    if (this.format === 'jsonl') {
      return this.saveJsonl(data);
    }
    // Implement other formats here
  }

  saveJsonl(data) {
    const filename = `results-${new Date().toISOString().split('T')[0]}.jsonl`;
    const filePath = path.join(this.baseDir, filename);
    
    const record = {
      timestamp: new Date().toISOString(),
      ...data
    };

    const line = JSON.stringify(record) + '\n';
    
    try {
      fs.appendFileSync(filePath, line);
      console.log(`Data saved to ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Failed to save data:', error);
      throw error;
    }
  }
}

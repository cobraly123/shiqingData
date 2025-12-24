import fs from 'fs';
import path from 'path';

export class KimiLogger {
  constructor(logDir = 'logs/kimi_interactions') {
    this.logDir = logDir;
    // Ensure absolute path if not provided
    if (!path.isAbsolute(this.logDir)) {
      this.logDir = path.resolve(process.cwd(), this.logDir);
    }
    
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  logInteraction(data) {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    const logFile = path.join(this.logDir, `kimi_interaction_${dateStr}.log`);

    const logEntry = {
      timestamp,
      ...data
    };

    const logString = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(logFile, logString);
      console.log(`[KimiLogger] Interaction logged to ${logFile}`);
    } catch (err) {
      console.error('[KimiLogger] Failed to write log:', err);
    }
  }

  logError(errorData) {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    const logFile = path.join(this.logDir, `kimi_errors_${dateStr}.log`);

    const logEntry = {
      timestamp,
      ...errorData
    };

    const logString = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(logFile, logString);
    } catch (err) {
      console.error('[KimiLogger] Failed to write error log:', err);
    }
  }
}

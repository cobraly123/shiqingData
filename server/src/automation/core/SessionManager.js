import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class SessionManager {
  constructor(baseDir = 'data/sessions') {
    this.baseDir = baseDir;
    this.algorithm = 'aes-256-cbc';
    // In production, this key should be in environment variables
    // For this POC, we generate a consistent key or use a fixed one if provided
    this.encryptionKey = process.env.SESSION_KEY 
        ? Buffer.from(process.env.SESSION_KEY, 'hex') 
        : crypto.scryptSync('default-secret-salt', 'salt', 32);
    
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getSessionPath(modelKey) {
    return path.join(this.baseDir, `${modelKey}_session.enc`);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  async saveSession(modelKey, context) {
    try {
      const storageState = await context.storageState();
      // Add metadata
      const sessionData = {
        timestamp: new Date().toISOString(),
        cookies: storageState.cookies,
        origins: storageState.origins,
        model: modelKey
      };
      
      const encryptedData = this.encrypt(JSON.stringify(sessionData));
      fs.writeFileSync(this.getSessionPath(modelKey), encryptedData);
      console.log(`Session saved securely for ${modelKey}`);
      return true;
    } catch (error) {
      console.error(`Failed to save session for ${modelKey}:`, error);
      return false;
    }
  }

  async loadSession(modelKey) {
    try {
      const filePath = this.getSessionPath(modelKey);
      if (!fs.existsSync(filePath)) {
        console.log(`No existing session found for ${modelKey}`);
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const decryptedData = JSON.parse(this.decrypt(fileContent));
      
      // Check expiration (example: 7 days)
      const sessionDate = new Date(decryptedData.timestamp);
      const now = new Date();
      const diffDays = (now - sessionDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays > 7) {
        console.log(`Session for ${modelKey} has expired (${diffDays.toFixed(1)} days old).`);
        return null;
      }

      console.log(`Loaded valid session for ${modelKey} (Age: ${diffDays.toFixed(1)} days)`);
      
      // Return in Playwright format
      return {
        cookies: decryptedData.cookies,
        origins: decryptedData.origins
      };
    } catch (error) {
      console.error(`Failed to load/decrypt session for ${modelKey}:`, error);
      return null; // Fallback to fresh session
    }
  }
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const credentialsPath = path.resolve(__dirname, '../kimi_credentials.txt');
const envPath = path.resolve(__dirname, '../.env');

if (!fs.existsSync(credentialsPath)) {
    console.error('Credentials file not found!');
    process.exit(1);
}

const content = fs.readFileSync(credentialsPath, 'utf-8');
const lines = content.split('\n');

let cookies = '';
let localStorageData = '';

for (const line of lines) {
    if (line.startsWith('KIMI_COOKIES=')) {
        cookies = line.trim();
    } else if (line.startsWith('# {"')) {
        localStorageData = line.replace('# ', '').trim();
    }
}

if (!cookies || !localStorageData) {
    console.error('Failed to parse credentials file.');
    console.log('Cookies found:', !!cookies);
    console.log('LocalStorage found:', !!localStorageData);
    process.exit(1);
}

// Prepare env entry
// We need to be careful with JSON in .env. It's safer to use single quotes.
// And we might need to escape single quotes inside the JSON if any.
const escapedLocalStorage = localStorageData.replace(/'/g, "'\\''"); 
const localStorageEntry = `KIMI_LOCAL_STORAGE='${escapedLocalStorage}'`;

// Read .env
let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
}

// Update Cookies
if (envContent.includes('KIMI_COOKIES=')) {
    envContent = envContent.replace(/^KIMI_COOKIES=.*$/m, cookies);
} else {
    envContent += `\n${cookies}`;
}

// Update LocalStorage
if (envContent.includes('KIMI_LOCAL_STORAGE=')) {
    envContent = envContent.replace(/^KIMI_LOCAL_STORAGE=.*$/m, localStorageEntry);
} else {
    envContent += `\n${localStorageEntry}`;
}

fs.writeFileSync(envPath, envContent);
console.log('Successfully updated .env with Kimi credentials!');

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Re-use some logic from SessionManager but simplified for this debug script
const USER_DATA_DIR = 'data/browser_profile';

async function debugKimiInteractive() {
    console.log('--- Starting Kimi Reference Debug (Interactive) ---');

    const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        viewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();
    
    // 1. Navigate
    await page.goto('https://www.kimi.com/');
    console.log('Navigated to Kimi.');

    // 2. Check Login (Quick check)
    const KIMI_TOKEN = process.env.KIMI_TOKEN;
    if (KIMI_TOKEN) {
        console.log('Injecting KIMI_TOKEN...');
        await page.evaluate((token) => {
            localStorage.setItem('refresh_token', token);
        }, KIMI_TOKEN);
        await page.reload();
        await page.waitForTimeout(2000);
    }

    // 3. Send Query
    const query = "介绍一下DeepSeek R1";
    console.log(`Sending query: ${query}`);
    
    const inputSelector = 'div[contenteditable="true"]';
    try {
        await page.waitForSelector(inputSelector, { timeout: 10000 });
        await page.click(inputSelector);
        await page.keyboard.type(query);
        await page.keyboard.press('Enter');
    } catch (e) {
        console.error("Could not find input box. Is user logged in?");
    }

    console.log('Waiting for response generation...');
    
    // Wait for response stability (simple heuristic)
    await page.waitForTimeout(5000); // Wait for start
    
    // Wait until "Stop" button disappears or sufficient time passes
    let stableCount = 0;
    let lastLength = 0;
    while (stableCount < 10) { // 10 * 1s = 10s stability
        await page.waitForTimeout(1000);
        const content = await page.evaluate(() => document.body.innerText.length);
        if (content === lastLength) {
            stableCount++;
        } else {
            stableCount = 0;
            lastLength = content;
        }
        process.stdout.write('.');
    }
    console.log('\nResponse generated (stable).');

    // 4. Interactive Phase (File Signal Method)
    console.log('\n' + '='.repeat(50));
    console.log('🛑 脚本暂停中 (SCRIPT PAUSED)');
    console.log('请在浏览器窗口中执行以下操作：');
    console.log('1. 观察当前页面。');
    console.log('2. 找到回复下方的“引用”或“参考资料”按钮（如果存在）。');
    console.log('3. **手动点击该按钮**，确保右侧侧边栏更新显示为引用列表。');
    console.log('\n>>> 完成操作后，请在 server 目录下创建文件 "continue.signal" 以继续...');
    console.log('>>> (例如在另一个终端运行: touch continue.signal)');
    console.log('='.repeat(50));

    const signalFile = path.resolve(process.cwd(), 'continue.signal');
    // Clean up previous signal
    if (fs.existsSync(signalFile)) fs.unlinkSync(signalFile);

    process.stdout.write('Waiting for signal file...');
    while (!fs.existsSync(signalFile)) {
        await new Promise(r => setTimeout(r, 1000));
        process.stdout.write('.');
    }
    console.log('\nSignal received! Resuming...');
    try { fs.unlinkSync(signalFile); } catch (e) {}

    // 5. Capture State
    console.log('Capturing DOM state...');
    const result = await page.evaluate(() => {
        const sideConsole = document.querySelector('.side-console-container');
        // Try to find specific headers or indicators in side console
        const sideHeader = sideConsole ? sideConsole.querySelector('.header') : null;
        
        // Find potential reference toggles
        const potentialToggles = Array.from(document.querySelectorAll('div, button, span')).filter(el => 
            el.innerText && (el.innerText.includes('引用') || el.innerText.includes('Reference') || el.innerText.includes('参考资料')) && 
            el.innerText.length < 50
        ).map(el => ({
            tagName: el.tagName,
            className: el.className,
            text: el.innerText,
            outerHTML: el.outerHTML
        }));

        const links = sideConsole ? Array.from(sideConsole.querySelectorAll('a')).map(a => ({
            url: a.href,
            text: a.innerText,
            className: a.className,
            outerHTML: a.outerHTML
        })) : [];

        return {
            sideConsoleHTML: sideConsole ? sideConsole.outerHTML : 'Not Found',
            sideHeaderText: sideHeader ? sideHeader.innerText : 'Not Found',
            links: links,
            potentialToggles: potentialToggles.slice(0, 20)
        };
    });

    // 6. Save Report
    const reportPath = 'kimi_ref_debug_report.md';
    let report = `# Kimi Reference Debug Report\n\n`;
    report += `## Side Console Header\n${result.sideHeaderText}\n\n`;
    report += `## Extracted Links (Count: ${result.links.length})\n`;
    // Filter likely relevant links (avoid tiny icons or nav links if possible, but dump all for now)
    result.links.slice(0, 20).forEach((l, i) => {
        report += `${i+1}. [${l.text.replace(/\n/g, ' ')}](${l.url})\n`;
        report += `   Class: ${l.className}\n`;
    });
    
    report += `\n## Potential Toggle Elements Found in DOM\n`;
    result.potentialToggles.forEach(t => {
        report += `- Tag: ${t.tagName}\n  Text: ${t.text}\n  Class: ${t.className}\n`;
        report += `  HTML: \`${t.outerHTML}\`\n\n`;
    });

    report += `\n## Side Console HTML Dump\n\`\`\`html\n${result.sideConsoleHTML}\n\`\`\`\n`;

    fs.writeFileSync(reportPath, report);
    console.log(`Debug report saved to ${reportPath}`);

    // Wait a bit before closing so user can see it finished
    await page.waitForTimeout(5000);
    await page.close();
    await browser.close();
}

debugKimiInteractive();

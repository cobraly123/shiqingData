
import { browserManager } from '../automation/core/BrowserManager.js';
import { DeepseekPage } from '../automation/pages/DeepSeekPage.js';
import { SessionManager } from '../automation/core/SessionManager.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });

async function verifyDeepseekSidePanel() {
    try {
        console.log('Starting Deepseek Side Panel Verification...');
        await browserManager.initialize({ headless: false });
        
        const sessionManager = new SessionManager();
        const modelKey = 'deepseek';
        const sessionState = await sessionManager.loadSession(modelKey);
        
        const context = await browserManager.newContext(sessionState ? { storageState: sessionState } : {});
        const page = await context.newPage();
        const deepseekPage = new DeepseekPage(page);
        
        await deepseekPage.navigate();
        
        if (!await deepseekPage.handleLogin()) {
            console.error('Login failed.');
            return;
        }
        
        const query = '详细介绍一下DeepSeek R1模型的特点，需要引用可靠来源。';
        await deepseekPage.sendQuery(query);
        await deepseekPage.waitForResponse(120000);
        
        console.log('Response generated. Snapshotting DOM state before clicking...');
        
        // Snapshot existing visible divs
        const beforeDivs = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('div')).map(d => ({
                class: d.className,
                rect: d.getBoundingClientRect(),
                text: d.innerText.substring(0, 50)
            })).filter(d => d.rect.width > 0 && d.rect.height > 0);
        });
        
        // Find and click the button
        const searchResultToggle = page.locator('div, button').filter({ hasText: /已阅读\s*\d+\s*个网页/ }).last();
        if (await searchResultToggle.isVisible()) {
            console.log('Clicking reference toggle button...');
            await searchResultToggle.click();
            await page.waitForTimeout(5000); // Wait for animation
            
            console.log('Snapshotting DOM state after clicking...');
            
            const afterDivs = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('div')).map(d => ({
                    class: d.className,
                    rect: d.getBoundingClientRect(),
                    text: d.innerText.substring(0, 50),
                    element: d // This won't serialize, but we use the index or logic inside evaluate
                })).filter(d => d.rect.width > 0 && d.rect.height > 0);
            });
            
            // Find new or changed divs
            // We look for a div that is:
            // 1. Visible now
            // 2. Was not visible or didn't exist before (simplified check: large height/width change or new class)
            // 3. Contains "来源" or has many links
            
            // Actually, let's just look for the Side Panel container by structure in the NEW state
            // The side panel is usually on the right side.
            
            const sidePanelData = await page.evaluate(() => {
                const windowWidth = window.innerWidth;
                // Find all divs that are on the right half of the screen and have substantial height
                const candidates = Array.from(document.querySelectorAll('div')).filter(d => {
                    const rect = d.getBoundingClientRect();
                    return rect.left > windowWidth * 0.6 && rect.height > 300 && rect.width > 200;
                });
                
                // Sort by z-index (highest first) if possible, or just pick the one with most links
                const bestCandidate = candidates.sort((a, b) => b.querySelectorAll('a').length - a.querySelectorAll('a').length)[0];
                
                if (!bestCandidate) return null;
                
                return {
                    className: bestCandidate.className,
                    html: bestCandidate.innerHTML,
                    text: bestCandidate.innerText,
                    linkCount: bestCandidate.querySelectorAll('a').length
                };
            });
            
            if (sidePanelData) {
                console.log('Potential Side Panel Found!');
                console.log('Class:', sidePanelData.className);
                console.log('Link Count:', sidePanelData.linkCount);
                console.log('Text Preview:', sidePanelData.text.substring(0, 200));
                
                // Now extract from this specific container
                const extracted = await page.evaluate((className) => {
                    const panel = document.getElementsByClassName(className)[0]; // This is risky if class is not unique
                    // Better to use the same logic or just pass the element if we could
                    // Let's re-find it
                    const windowWidth = window.innerWidth;
                    const candidates = Array.from(document.querySelectorAll('div')).filter(d => {
                        const rect = d.getBoundingClientRect();
                        return rect.left > windowWidth * 0.6 && rect.height > 300 && rect.width > 200;
                    });
                    const targetPanel = candidates.sort((a, b) => b.querySelectorAll('a').length - a.querySelectorAll('a').length)[0];
                    
                    if (!targetPanel) return [];
                    
                    const results = [];
                    const links = targetPanel.querySelectorAll('a[target="_blank"]');
                    
                    links.forEach(link => {
                        // Heuristic for Deepseek Side Panel Item
                        // [Favicon] [Source Name]
                        // [Title]
                        // [Snippet]
                        
                        // Navigate up to the item container
                        let container = link.parentElement;
                        // Go up until we hit a block that seems to be the "Item"
                        // The item usually has a class like "ds-reference-item" or just a div
                        
                        // Let's grab the text of the container that includes the link and the source name
                        // Usually 3 levels up is safe enough to capture the card
                        let card = link;
                        for(let i=0; i<3; i++) {
                            if (card.parentElement && card.parentElement !== targetPanel) {
                                card = card.parentElement;
                            }
                        }
                        
                        const text = card.innerText;
                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                        
                        if (lines.length >= 2) {
                            const title = link.innerText.trim();
                            // Find title in lines
                            const titleIndex = lines.indexOf(title);
                            
                            let sourceName = lines[0];
                            if (titleIndex > 0) {
                                sourceName = lines[0];
                            } else {
                                // Maybe title is first? Then source name might be missing or below?
                                // Usually Source Name is Top.
                            }
                            
                            // Remove "· 1 day ago" etc
                            sourceName = sourceName.replace(/·.*$/, '').trim();
                            
                            if (!results.find(r => r.url === link.href)) {
                                results.push({
                                    sourceName: sourceName,
                                    title: title,
                                    url: link.href
                                });
                            }
                        }
                    });
                    return results;
                }, sidePanelData.className);
                
                console.log('Extracted Sources:', JSON.stringify(extracted, null, 2));
                
            } else {
                console.log('No side panel candidate found on the right side.');
            }

        } else {
            console.log('Toggle button not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browserManager.close();
    }
}

verifyDeepseekSidePanel();

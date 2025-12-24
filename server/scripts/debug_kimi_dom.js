import 'dotenv/config';
import { QueryEngine } from '../src/automation/core/QueryEngine.js';
import { browserManager } from '../src/automation/core/BrowserManager.js';
import fs from 'fs';

async function debugKimiDom() {
  const isHeadless = false;
  console.log('--- Debugging Kimi DOM Structure ---');

  // Reuse session if available to save time, or just run
  await browserManager.initialize({ headless: isHeadless });
  const engine = new QueryEngine();
  
  const query = "介绍一下DeepSeek R1";
  const model = 'kimi';

  try {
      // Manually drive the page to inspect DOM
      // We can use QueryEngine but we want to intercept the page object before it closes
      // But QueryEngine closes context. 
      // Let's use KimiPage directly or just modify verify_kimi.js to dump DOM.
      // Actually, QueryEngine has a debug mode that saves HTML on failure.
      // But we want it on success too.
      
      // Let's copy logic from QueryEngine but keep it open
      
      const { KimiPage } = await import('../src/automation/pages/KimiPage.js');
      const context = await browserManager.newContext({});
      const page = await context.newPage();
      const kimiPage = new KimiPage(page, 'kimi');
      
      await kimiPage.navigate();
      await kimiPage.handleLogin();
      await kimiPage.sendQuery(query);
      
      // Wait for response
      await kimiPage.waitForResponse(120000); // 2 mins
      
      // Now inspect DOM
      console.log('Inspecting DOM...');
      
      const responseSelector = kimiPage.modelConfig.selectors.response;
      console.log('Using response selector:', responseSelector);
      
      const elements = await page.$$(responseSelector);
      const lastElement = elements[elements.length - 1];
      
      if (lastElement) {
          // Dump structure of the element and its parent
          const structure = await page.evaluate((el) => {
              const info = {
                  tagName: el.tagName,
                  classes: el.className,
                  textStart: el.innerText.substring(0, 50),
                  parent: null
              };
              
              // Traverse up to find the bubble container
               let current = el;
               let path = [];
               let bubbleCandidate = null;
               
               while (current && current.tagName !== 'BODY' && path.length < 10) {
                    const siblingInfo = {
                        prev: current.previousElementSibling ? current.previousElementSibling.className : 'null',
                        next: current.nextElementSibling ? current.nextElementSibling.className : 'null',
                        prevHasSite: current.previousElementSibling ? current.previousElementSibling.querySelectorAll('a.site').length : 0,
                         nextHasSite: current.nextElementSibling ? current.nextElementSibling.querySelectorAll('a.site').length : 0,
                         prevHtml: current.previousElementSibling ? current.previousElementSibling.innerHTML.substring(0, 200) : '',
                         nextHtml: current.nextElementSibling ? current.nextElementSibling.innerHTML.substring(0, 200) : ''
                     };
                    
                    path.push({
                        tagName: current.tagName,
                        classes: current.className,
                        siblings: siblingInfo
                    });
                    
                    current = current.parentElement;
                }
               
               info.ancestorPath = path;

                // Extra: Find all links in the page to see what classes they have
                const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
                    href: a.href,
                    class: a.className,
                    text: a.innerText.substring(0, 50),
                    parentClass: a.parentElement ? a.parentElement.className : 'null'
                }));
                info.allLinksSample = allLinks.slice(0, 20); // First 20 links

                // Extra: Find specific containers and dump their content
                const searchContainer = document.querySelector('.block-container') || document.querySelector('.toolcall-title-container');
                const refContainer = document.querySelector('.okc-cards-container');
                
                return {
                    info,
                    searchContainerHtml: searchContainer ? searchContainer.outerHTML : 'Not Found',
                    refContainerHtml: refContainer ? refContainer.outerHTML : 'Not Found'
                };
           }, lastElement);
          
          console.log('DOM Structure:', JSON.stringify(structure.info, null, 2));
          
          // Save HTML dumps
          fs.writeFileSync('kimi_search_container.html', structure.searchContainerHtml);
          fs.writeFileSync('kimi_ref_container.html', structure.refContainerHtml);
          console.log('Saved kimi_search_container.html and kimi_ref_container.html');
          
          // Save full HTML for offline inspection
          const content = await page.content();
          fs.writeFileSync('kimi_debug_dom.html', content);
          console.log('Saved kimi_debug_dom.html');
      } else {
          console.log('No response element found');
      }

  } catch (e) {
      console.error('Exception:', e);
  }

  await browserManager.close();
}

debugKimiDom();

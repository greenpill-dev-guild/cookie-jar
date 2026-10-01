import {chromium} from '/Users/afo/Code/greenpill/cookie-jar/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
const out='/Users/afo/Code/greenpill/cookie-jar/docs/qa/stipend-2026-09-05/evidence';
const browser=await chromium.launch();const results=[];
for(const width of [1440,375])for(const theme of ['light','dark']){
const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme});
await context.addInitScript(theme=>localStorage.setItem('theme',theme),theme);
const item={width,theme,blockedExternalRequests:[]};
await context.route('**/*',route=>{const u=new URL(route.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname)){item.blockedExternalRequests.push(u.origin);return route.abort('blockedbyclient');}return route.continue();});
const page=await context.newPage();await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await page.getByText('No featured jar configured',{exact:true}).waitFor({timeout:45000});
await page.getByRole('button',{name:'Connect',exact:true}).waitFor({timeout:30000});
item.text=await page.locator('body').innerText();item.jarsLinks=await page.locator('a[href="/jars"]').count();
await page.screenshot({path:`${out}/no-featured-${width}-${theme}.png`,fullPage:true});
results.push(item);await writeFile(`${out}/no-featured.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(item));await context.close();}
await browser.close();

import {chromium} from '/Users/afo/Code/greenpill/cookie-jar/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
const out='/Users/afo/Code/greenpill/cookie-jar/docs/qa/stipend-2026-09-05/evidence';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);
await page.goto('http://localhost:3000/jars',{waitUntil:'domcontentloaded'});
const title=page.getByText('Team Hat Stipend (demo)',{exact:true});await title.waitFor();
const card=page.locator('.cj-card-primary').filter({has:title});
const result={card:await card.evaluate(e=>({tag:e.tagName,tabIndex:e.tabIndex,role:e.getAttribute('role'),focusableDescendants:e.querySelectorAll('a,button,input,[tabindex]').length})),keyboard:[]};
for(let i=0;i<12;i++){await page.keyboard.press('Tab');result.keyboard.push(await page.evaluate(()=>{const e=document.activeElement;return{tag:e.tagName,text:e.textContent?.trim().slice(0,70),placeholder:e.getAttribute('placeholder'),role:e.getAttribute('role')};}));}
await title.click();await page.waitForURL('**/jar/0x5ef012c81ABC229Df10037b9001937E55671E36E');result.mouseDestination=page.url();
await page.goto('http://localhost:3000/create',{waitUntil:'domcontentloaded'});await page.locator('#jarName').waitFor();
await page.locator('#jarName').fill('QA stipend jar');
await page.locator('#jarOwner').fill('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
result.createFirstStep=await page.locator('main').innerText();
result.buttons=await page.getByRole('button').allTextContents();
await writeFile(`${out}/keyboard.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();

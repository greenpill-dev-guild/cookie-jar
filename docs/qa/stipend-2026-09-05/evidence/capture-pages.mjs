import { chromium } from '/Users/afo/Code/greenpill/cookie-jar/node_modules/@playwright/test/index.mjs';
import AxeBuilder from '/Users/afo/Code/greenpill/cookie-jar/node_modules/@axe-core/playwright/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const out = '/Users/afo/Code/greenpill/cookie-jar/docs/qa/stipend-2026-09-05/evidence';
const base = 'http://localhost:3000';
const jar = '0x5ef012c81ABC229Df10037b9001937E55671E36E';
const clean = s => s.replace(/https?:\/\/[^\s"<>]+/g, value => { try { const u = new URL(value); if (u.hostname.endsWith('alchemy.com')) u.pathname = '/[redacted]'; if(u.search)u.search='?[redacted]'; return u.toString(); } catch { return value; } });
const browser = await chromium.launch();
await mkdir(out, { recursive: true });
const reports = [];
for (const width of [1440,375]) {
 for (const theme of ['light','dark']) {
  const context = await browser.newContext({viewport:{width,height:900},colorScheme:theme});
  await context.addInitScript(theme => localStorage.setItem('theme',theme), theme);
  // Keep this preliminary pass on local Anvil. No live RPC calls are authorized yet.
  await context.route('**/*', async route => {
   const u=new URL(route.request().url());
   if(/arbitrum|alchemy|nodies|blockpi|1rpc|ankr|llamarpc|forno|gnosischain|mainnet\.|sepolia\./.test(u.hostname)) return route.abort('blockedbyclient');
   return route.continue();
  });
  for (const [name,path] of [['home','/'],['jar',`/jar/${jar}`],['jars','/jars'],['create','/create'],['profile','/profile'],['bad-address','/jar/not-an-address'],['not-found','/qa-no-such-page']]) {
   const page = await context.newPage();
   const item={name,path,width,theme,console:[],pageErrors:[],failedRequests:[],httpErrors:[]};
   page.on('console',m=>{ if(['error','warning','warn'].includes(m.type()))item.console.push({type:m.type(),text:clean(m.text())}); });
   page.on('pageerror',e=>item.pageErrors.push(clean(e.message)));
   page.on('requestfailed',r=>item.failedRequests.push({url:clean(r.url()),error:r.failure()?.errorText}));
   page.on('response',r=>{if(r.status()>=400)item.httpErrors.push({url:clean(r.url()),status:r.status()});});
   try {
    const response = await page.goto(base+path, {waitUntil:'domcontentloaded',timeout:45000});
    item.status=response.status();
    await page.locator('header button').first().waitFor({timeout:20000});
    if(name==='home'||name==='jar') await page.getByText('In the jar',{exact:true}).waitFor({timeout:30000});
    try { await page.waitForLoadState('networkidle',{timeout:10000}); } catch {item.networkIdleTimedOut=true;}
    item.finalUrl=page.url();
    item.text=await page.locator('body').innerText();
    item.dom=await page.evaluate(()=>{
     const visible=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e); return b.width>0&&b.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
     const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
     return {
      viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
      theme:document.documentElement.className,background:getComputedStyle(document.body).backgroundColor,
      controls:[...document.querySelectorAll('button,a,input,textarea,select,[role="tab"],[role="combobox"]')].filter(visible).map(e=>({tag:e.tagName,role:e.getAttribute('role'),text:(e.innerText||e.textContent||'').trim().slice(0,120),label:e.getAttribute('aria-label'),title:e.getAttribute('title'),id:e.id,href:e.getAttribute('href'),disabled:e.disabled,selected:e.getAttribute('aria-selected'),rect:rect(e),pointerEvents:getComputedStyle(e).pointerEvents})),
      inputs:[...document.querySelectorAll('input,textarea,select')].filter(visible).map(e=>({id:e.id,type:e.type,ariaLabel:e.getAttribute('aria-label'),ariaLabelledby:e.getAttribute('aria-labelledby'),labels:[...(e.labels||[])].map(l=>l.textContent),placeholder:e.getAttribute('placeholder')})),
      overflow:[...document.querySelectorAll('body *')].filter(visible).filter(e=>e.getBoundingClientRect().right>innerWidth+1||e.getBoundingClientRect().left < -1).slice(0,25).map(e=>({tag:e.tagName,text:(e.textContent||'').trim().slice(0,100),rect:rect(e)})),
      headings:[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e=>({tag:e.tagName,text:e.textContent})),
      images:[...document.images].map(e=>({alt:e.alt,src:e.getAttribute('src'),complete:e.complete,naturalWidth:e.naturalWidth})),
     };
    });
    item.screenshot=`${name}-${width}-${theme}.png`;
    await page.screenshot({path:`${out}/${item.screenshot}`,fullPage:true});
    const axe = await new AxeBuilder({page}).analyze();
    item.axe=axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))}));
    item.focus=[];
    await page.mouse.click(width-2,70);
    for(let i=0;i<Math.min(12,item.dom.controls.length);i++) {
     await page.keyboard.press('Tab');
     item.focus.push(await page.evaluate(()=>{ const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,text:(e.innerText||e.textContent||'').trim().slice(0,90),label:e.getAttribute('aria-label'),focusVisible:e.matches(':focus-visible'),outline:s.outline,boxShadow:s.boxShadow,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}; }));
    }
   } catch(e) {item.error=clean(e.message);await page.screenshot({path:`${out}/${name}-${width}-${theme}-error.png`,fullPage:true}).catch(()=>{});}
   reports.push(item);
   await writeFile(`${out}/pages.json`,JSON.stringify(reports,null,2));
   console.log(JSON.stringify({name,width,theme,status:item.status,url:item.finalUrl,error:item.error,overflow:item.dom?.scrollWidth,axe:item.axe?.map(x=>({id:x.id,impact:x.impact,n:x.nodes.length})),console:item.console.length,failed:item.failedRequests.length,http:item.httpErrors.length}));
   await page.close();
  }
  await context.close();
 }
}
await browser.close();

const { createRequire } = require('node:module');
const fs = require('node:fs');
const { chromium, expect } = createRequire('/Users/afo/Code/greenpill/cookie-jar/package.json')('@playwright/test');
const mode = process.argv[2];
const output = `/tmp/stipend-production-${mode}`;
fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await chromium.launch();
 const observations = [];
 try {
  for (const width of [375,1440]) for (const theme of ['light','dark']) {
   const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
   const page = await context.newPage();
   const errors=[], failed=[], rpcMethods=[];
   page.on('pageerror', e => errors.push(e.message));
   page.on('requestfailed', r => failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
   await page.route('**/*', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
     let body; try { body=request.postDataJSON(); } catch {}
     for (const call of Array.isArray(body) ? body : [body]) if (call?.method) {
      rpcMethods.push(call.method);
      if (/sendTransaction|sendRawTransaction|sign/i.test(call.method)) throw new Error('Production proof permits reads only');
     }
    }
    await route.continue();
   });
   await page.goto('http://localhost:3040/', { waitUntil: 'domcontentloaded' });
   if (mode === 'empty') {
    await expect(page.getByRole('heading', { name: 'No featured jar configured' })).toBeVisible({timeout:60000});
    await expect(page.getByRole('link', {name: 'Browse all jars'})).toHaveAttribute('href', '/jars');
   } else {
    await expect(page.getByRole('button', {name:'Copy jar address'})).toBeVisible({timeout:60000});
    await expect(page.getByText(/160\.0000\s*USDC/).first()).toBeVisible({timeout:60000});
    await expect(page.getByText('Allowlist', {exact:true}).first()).toBeVisible();
   }
   await expect.poll(() => page.locator('main').evaluate(el => [el, ...el.querySelectorAll('[style]')].every(node => Number(getComputedStyle(node).opacity) > 0.99)), {timeout:30000}).toBe(true);
   expect(await page.evaluate(() => !!window.ethereum)).toBe(false);
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
   const text=await page.locator('main').innerText();
   observations.push({width,theme,text,errors,failed,rpcMethods,hasWallet:false});
   await page.screenshot({path:`${output}/${width}-${theme}.png`,fullPage:true,caret:"initial",animations:"disabled"});
   await context.close();
  }
 } finally {
  fs.writeFileSync(`${output}/observations.json`,JSON.stringify(observations,null,2));
  await browser.close();
 }
 console.log(`${mode}: ${observations.length} desktop/mobile light/dark checks passed, no wallet or transaction`);
})().catch(error=>{console.error(error);process.exitCode=1});

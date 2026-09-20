// UI acceptance in disposable browser contexts; never touches the owner's Chrome profile.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import fs from 'node:fs/promises';
const base=process.env.BASE||'http://127.0.0.1:4344',out=process.env.OUT||process.cwd()+'/qa/usability';
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'chrome'});
const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const p=await ctx.newPage(),report={base,checks:[],errors:[]};p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(e.message));
function check(pass,name){report.checks.push({name,pass:!!pass});if(!pass)throw Error(name)}
try{
 await p.goto(base+'/cinema-detail-04.html',{waitUntil:'domcontentloaded'});await p.locator('.d4-mobile-menu').waitFor();
 await p.locator('.d4-mobile-menu').click();check(await p.locator('[data-about]').isVisible(),'mobile navigation available');
 await p.locator('[data-about]').click();check(await p.locator('dialog[open]').isVisible(),'About opens on touch viewport');await p.locator('.dialog-close').click();
 await p.locator('#start').click();for(let q=1;q<=2;q++){await p.locator('.question-index').filter({hasText:'Q0'+q}).waitFor();await p.locator('.option').first().click()}
 await p.locator('.question-index').filter({hasText:'Q03'}).waitFor();await p.evaluate(()=>navigator.serviceWorker.ready);
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('.question-index').filter({hasText:'Q03'}).waitFor();check(await p.locator('.decision-cells .is-recorded').count()===2,'reload resumes the exact question and receipt');
 await p.locator('.d4-phase-track').first().waitFor();await p.screenshot({path:out+'/touch-quiz.png'});
 await ctx.setOffline(true);for(let q=3;q<=18;q++){await p.locator('.question-index').filter({hasText:'Q'+String(q).padStart(2,'0')}).waitFor();await p.locator('.option').first().click()}
 await p.locator('.d4-plate-imprint').waitFor();check(true,'warmed assessment completes while offline');
 await p.reload({waitUntil:'domcontentloaded'});await p.locator('.d4-plate-imprint').waitFor();check(true,'offline result reload restores identity');await ctx.setOffline(false);
 check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'touch viewport has no horizontal overflow');
 await p.screenshot({path:out+'/touch-result.png'});check(report.errors.length===0,'no JavaScript exceptions');report.result='PASS';
}catch(e){report.result='FAIL';report.failure=e.stack;process.exitCode=1}finally{await fs.writeFile(out+'/usability.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close()}

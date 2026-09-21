import {chromium} from '/Users/zhuo/.cache/trader-dna-v48-manual/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const base=process.env.BASE||'http://127.0.0.1:4345';
const url=base+'/scan01.html?start=scan01&utm_source=event&utm_medium=qr&utm_campaign=20261003';
const out=process.env.OUT||'/Users/zhuo/.cache/trader-dna-detail-04/qa/mobile-qr';
await fs.mkdir(out,{recursive:true});
const cases=[['iphone-se',320,568],['iphone-8',375,667],['iphone-15',393,852],['iphone-max',430,932],['landscape',844,390],['ipad',768,1024]];
const slowLimit=Number(process.env.SLOW_LIMIT_MS||15000);const report={base,url,slowLimit,checks:[],errors:[],bad:[]};
const check=(ok,name,data)=>{report.checks.push({name,pass:!!ok,data});if(!ok)throw Error(name+' '+JSON.stringify(data??''))};
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const [name,width,height] of cases){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<768,deviceScaleFactor:2});
  const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(name+': '+e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)report.bad.push(name+': '+r.status()+' '+r.url())});
  await p.goto(url,{waitUntil:'domcontentloaded',timeout:15000});await p.waitForFunction(()=>document.querySelector('.question-index')?.textContent.trim()==='Q01');
  check(await p.locator('body').getAttribute('data-edition')==='detail-04',name+' detail04');
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' no horizontal overflow');
  const minH=await p.locator('.option').evaluateAll(xs=>Math.min(...xs.map(x=>x.getBoundingClientRect().height)));check(minH>=44,name+' touch targets',minH);

  const bars=await p.locator('.detail-chapters>li').count();check(bars===3,name+' three phase rails',bars);
  if(width<=760){const menu=p.locator('.d4-mobile-menu');check(await menu.isVisible(),name+' mobile menu visible');await menu.click();check(await p.locator('.cinema-nav').isVisible(),name+' menu opens');const box=await p.locator('.cinema-nav').boundingBox();check(box&&box.x>=0&&box.x+box.width<=width+1,name+' menu stays in viewport',box);await menu.click()}
  await p.locator('.option').first().click();await p.waitForFunction(()=>document.querySelector('.question-index')?.textContent.trim()==='Q02');await p.waitForTimeout(120);
  check(await p.evaluate(()=>document.querySelector('.meta').getBoundingClientRect().top>=document.querySelector('.topbar').getBoundingClientRect().bottom-1),name+' q2 clears sticky header');
  await p.screenshot({path:`${out}/${name}.png`,fullPage:false});await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true,deviceScaleFactor:2});const p=await ctx.newPage();await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('.question-index')?.textContent.trim()==='Q01');
 for(let i=1;i<=18;i++){await p.locator('.option').first().click();if(i<18)await p.waitForFunction(n=>document.querySelector('.question-index')?.textContent.trim()===`Q${String(n).padStart(2,'0')}`,i+1)}
 await p.locator('.result').waitFor({timeout:10000});const src=await p.evaluate(()=>JSON.parse(localStorage.getItem('82trade-trader-dna:standard-v1-2026-09')).completedRecord.source);
 check(src.utm_source==='event'&&src.utm_medium==='qr'&&src.utm_campaign==='20261003','QR UTM survives completion',src);await ctx.close();
 const slow=await browser.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});const sp=await slow.newPage();const cdp=await slow.newCDPSession(sp);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:250*1024/8,uploadThroughput:100*1024/8});const t0=Date.now();await sp.goto(url,{waitUntil:'domcontentloaded',timeout:20000});await sp.waitForFunction(()=>document.querySelector('.question-index')?.textContent.trim()==='Q01',{timeout:20000});const ms=Date.now()-t0;check(ms<slowLimit,'slow-network direct QR reaches Q1',ms);report.slowNetworkMs=ms;await slow.close();
 const off=await browser.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true});const op=await off.newPage();await op.goto(url,{waitUntil:'domcontentloaded'});await op.waitForFunction(()=>document.querySelector('.question-index')?.textContent.trim()==='Q01');await op.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await op.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:10000});await op.locator('.option').first().click();await op.waitForFunction(()=>document.querySelector('.question-index')?.textContent.trim()==='Q02');await off.setOffline(true);await op.reload({waitUntil:'domcontentloaded',timeout:12000});await op.waitForFunction(()=>document.querySelector('.question-index')?.textContent.trim()==='Q02',{timeout:10000});check(true,'offline refresh resumes after first QR load');await off.close();
 check(report.errors.length===0,'no JS errors',report.errors);check(report.bad.length===0,'no bad site responses',report.bad);report.result='PASS';
}catch(e){report.result='FAIL';report.failure=e.stack;process.exitCode=1}finally{await fs.writeFile(out+'/mobile-qr-gate.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close()}

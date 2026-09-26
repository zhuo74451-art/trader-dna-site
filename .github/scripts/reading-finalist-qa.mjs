import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const out="reading-finalist-qa";
fs.mkdirSync(out,{recursive:true});
const port=4191;
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml"};
const server=http.createServer((req,res)=>{
  let pathname=new URL(req.url,`http://127.0.0.1:${port}`).pathname;
  if(pathname==="/") pathname="/82trade-motion-lab/reading-v17.html";
  let target=path.join(root,pathname.replace(/^\//,""));
  if(!target.startsWith(root)){res.writeHead(403);res.end();return}
  try{
    const stat=fs.statSync(target);
    if(stat.isDirectory()) target=path.join(target,"index.html");
    res.writeHead(200,{"content-type":mime[path.extname(target).toLowerCase()]||"application/octet-stream"});
    fs.createReadStream(target).pipe(res);
  }catch{res.writeHead(404);res.end("not found")}
});
await new Promise(r=>server.listen(port,"127.0.0.1",r));

const browser=await chromium.launch({headless:true});
const report={};

async function capture(version){
  const name=`reading-v${version}`;
  const context=await browser.newContext({viewport:{width:1512,height:982}});
  const page=await context.newPage();
  const errors=[]; const failed=[];
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("requestfailed",req=>failed.push({url:req.url(),error:req.failure()?.errorText||null}));
  const resp=await page.goto(`http://127.0.0.1:${port}/82trade-motion-lab/${name}.html`,{waitUntil:"networkidle"});
  await page.waitForTimeout(550);
  await page.screenshot({path:path.join(out,`${name}-desktop-01.png`)});

  for(const [idx,label,title] of [[1,"02-market","技術分析聖經"],[2,"03-growth","納瓦爾寶典"]]){
    await page.locator(`[data-tab="${idx}"]`).click();
    await page.waitForFunction(t=>document.querySelector("[data-title]")?.textContent?.trim()===t,title,{timeout:3000});
    await page.waitForTimeout(850);
    await page.screenshot({path:path.join(out,`${name}-desktop-${label}.png`)});
  }

  report[name]=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    title:document.querySelector("[data-title]")?.textContent?.trim()??null,
    active:Array.from(document.querySelectorAll("[data-tab]")).findIndex(el=>el.getAttribute("data-active")==="true"),
    bookRect:(()=>{const el=document.querySelector("[data-book]");if(!(el instanceof HTMLElement))return null;const r=el.getBoundingClientRect();return{width:r.width,height:r.height,top:r.top,left:r.left}})()
  }));
  report[name].status=resp?.status()??null;
  report[name].errors=errors;
  report[name].failed=failed;
  await context.close();

  const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobile=await mobileContext.newPage();
  await mobile.goto(`http://127.0.0.1:${port}/82trade-motion-lab/${name}.html`,{waitUntil:"networkidle"});
  await mobile.waitForTimeout(550);
  await mobile.screenshot({path:path.join(out,`${name}-mobile-01.png`)});
  report[name].mobile=await mobile.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,scrollHeight:document.documentElement.scrollHeight}));
  await mobileContext.close();
}

for(const v of [23,24]) await capture(v);
fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

for(const [name,r] of Object.entries(report)){
  if(r.status!==200) throw new Error(`${name}: status ${r.status}`);
  if(r.errors.length) throw new Error(`${name}: errors ${r.errors.join(" | ")}`);
  if(r.failed.length) throw new Error(`${name}: failed requests ${JSON.stringify(r.failed)}`);
  if(r.scrollWidth!==r.clientWidth) throw new Error(`${name}: desktop overflow ${r.scrollWidth}/${r.clientWidth}`);
  if(r.mobile.scrollWidth!==r.mobile.clientWidth) throw new Error(`${name}: mobile overflow ${r.mobile.scrollWidth}/${r.mobile.clientWidth}`);
  if(r.active!==2||r.title!=="納瓦爾寶典") throw new Error(`${name}: switching failed`);
}
await browser.close();
await new Promise(r=>server.close(r));

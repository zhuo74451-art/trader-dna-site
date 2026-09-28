import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd(),out="original-upgrade-v3-qa",port=4263;
fs.mkdirSync(out,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp"};
const server=http.createServer((req,res)=>{
  const p=decodeURIComponent(new URL(req.url,`http://127.0.0.1:${port}`).pathname.replace(/^\//,""));
  let target=path.resolve(root,p||"index.html");
  if(!target.startsWith(root)){res.writeHead(403);res.end();return}
  try{const st=fs.statSync(target);if(st.isDirectory())target=path.join(target,"index.html");res.writeHead(200,{"content-type":mime[path.extname(target).toLowerCase()]||"application/octet-stream"});fs.createReadStream(target).pipe(res)}
  catch{res.writeHead(404);res.end("not found")}
});
await new Promise(r=>server.listen(port,"127.0.0.1",r));
const url=`http://127.0.0.1:${port}/82trade-motion-lab/original-upgrade-v3.html`;
const report={};

async function run(name,viewport,reduced=false){
  const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader"]});
  const context=await browser.newContext({viewport,reducedMotion:reduced?"reduce":"no-preference"});
  const page=await context.newPage();
  const errors=[],failed=[];
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("requestfailed",r=>failed.push({url:r.url(),error:r.failure()?.errorText||null}));
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForTimeout(2200);
  const initial=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,title:document.title,cards:document.querySelectorAll(".card").length,steps:document.querySelectorAll(".start-step").length}));
  await page.screenshot({path:path.join(out,`${name}-hero.png`)});
  if(!reduced&&viewport.width>=1000){
    const card=page.locator(".card").first();await card.scrollIntoViewIfNeeded();await page.waitForTimeout(250);await card.hover();await page.waitForTimeout(350);
    const cta=await page.locator(".card").first().locator(".card-cta").evaluate(el=>({opacity:getComputedStyle(el).opacity,color:getComputedStyle(el).color,border:getComputedStyle(el).borderColor}));
    report.desktopCardCta=cta;
    await page.screenshot({path:path.join(out,"desktop-card-hover.png")});
  }
  if(viewport.width<600){
    await page.locator("#start").scrollIntoViewIfNeeded();await page.waitForTimeout(350);await page.screenshot({path:path.join(out,"mobile-start.png")});
  }
  report[name]={status:response?.status()??null,errors,failed,initial};
  await browser.close();
}
await run("desktop",{width:1440,height:900});
await run("mobile",{width:390,height:844});
await run("reduced",{width:1440,height:900},true);
for(const [name,r] of Object.entries(report)){
 if(!r||!("status" in r))continue;
 if(r.status!==200)throw new Error(`${name}: HTTP ${r.status}`);
 if(r.initial.scrollWidth!==r.initial.clientWidth)throw new Error(`${name}: overflow`);
 if(r.errors.length)throw new Error(`${name}: ${r.errors.join(" | ")}`);
}
if(report.desktopCardCta?.opacity!=="1")throw new Error("card CTA did not become visible on hover");
fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await new Promise(r=>server.close(r));

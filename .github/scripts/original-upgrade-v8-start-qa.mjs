import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd(),out="original-upgrade-v8-start-qa",port=4268;
fs.mkdirSync(out,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp"};

const server=http.createServer((req,res)=>{
  const p=decodeURIComponent(new URL(req.url,`http://127.0.0.1:${port}`).pathname.replace(/^\//,""));
  let target=path.resolve(root,p||"index.html");
  if(!target.startsWith(root)){res.writeHead(403);res.end();return}
  try{
    const st=fs.statSync(target);
    if(st.isDirectory())target=path.join(target,"index.html");
    res.writeHead(200,{"content-type":mime[path.extname(target).toLowerCase()]||"application/octet-stream"});
    fs.createReadStream(target).pipe(res);
  }catch{res.writeHead(404);res.end("not found")}
});
await new Promise(r=>server.listen(port,"127.0.0.1",r));

const url=`http://127.0.0.1:${port}/82trade-motion-lab/original-upgrade-v8-start-finale.html`;
const report={};

async function run(name,viewport,reduced=false){
  const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader"]});
  const context=await browser.newContext({viewport,reducedMotion:reduced?"reduce":"no-preference"});
  const page=await context.newPage();
  const errors=[];
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  page.on("pageerror",e=>errors.push(e.message));

  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForTimeout(1800);
  const start=page.locator("#start");
  await start.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);

  const base=await page.evaluate(()=>({
    sw:document.documentElement.scrollWidth,
    cw:document.documentElement.clientWidth,
    count:document.querySelector("[data-step-count]")?.textContent?.trim(),
    scenes:document.querySelectorAll(".preview-scene").length,
    rails:document.querySelectorAll(".rail-node").length,
    reduced:matchMedia("(prefers-reduced-motion: reduce)").matches
  }));
  await page.screenshot({path:path.join(out,`${name}-step1.png`),fullPage:false});

  const second=page.locator(".start-step").nth(1);
  await second.click();
  await page.waitForTimeout(reduced?20:420);
  const step2=await page.evaluate(()=>({
    count:document.querySelector("[data-step-count]")?.textContent?.trim(),
    activeScene:[...document.querySelectorAll(".preview-scene")].findIndex(x=>x.classList.contains("is-active")),
    activeRail:[...document.querySelectorAll(".rail-node")].findIndex(x=>x.classList.contains("is-active")),
    progress:getComputedStyle(document.querySelector(".start-section")).getPropertyValue("--step-progress").trim()
  }));
  await page.screenshot({path:path.join(out,`${name}-step2.png`),fullPage:false});

  const third=page.locator(".start-step").nth(2);
  await third.click();
  await page.waitForTimeout(reduced?20:420);
  const step3=await page.evaluate(()=>({
    count:document.querySelector("[data-step-count]")?.textContent?.trim(),
    activeScene:[...document.querySelectorAll(".preview-scene")].findIndex(x=>x.classList.contains("is-active")),
    activeRail:[...document.querySelectorAll(".rail-node")].findIndex(x=>x.classList.contains("is-active")),
    progress:getComputedStyle(document.querySelector(".start-section")).getPropertyValue("--step-progress").trim()
  }));
  await page.screenshot({path:path.join(out,`${name}-step3.png`),fullPage:false});

  report[name]={status:response?.status()??null,errors,base,step2,step3};
  await browser.close();
}

await run("desktop",{width:1440,height:900},false);
await run("mobile",{width:390,height:844},false);
await run("reduced",{width:1440,height:900},true);

for(const [name,r] of Object.entries(report)){
  if(r.status!==200)throw new Error(`${name}: HTTP ${r.status}`);
  if(r.base.sw!==r.base.cw)throw new Error(`${name}: horizontal overflow ${r.base.sw}/${r.base.cw}`);
  if(r.base.scenes!==3||r.base.rails!==3)throw new Error(`${name}: scene/rail count mismatch`);
  if(r.step2.count!=="02"||r.step2.activeScene!==1||r.step2.activeRail!==1)throw new Error(`${name}: step 2 sync failed`);
  if(r.step3.count!=="03"||r.step3.activeScene!==2||r.step3.activeRail!==2)throw new Error(`${name}: step 3 sync failed`);
  if(r.errors.length)throw new Error(`${name}: page errors: ${r.errors.join(" | ")}`);
}
if(!report.reduced.base.reduced)throw new Error("reduced-motion context not active");

fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await new Promise(r=>server.close(r));

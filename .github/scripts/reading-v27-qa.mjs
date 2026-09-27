import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const port = 4197;
const out = "reading-v27-qa";
fs.mkdirSync(out,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg"};

const server=http.createServer((req,res)=>{
  let pathname=new URL(req.url,`http://127.0.0.1:${port}`).pathname;
  const target=path.join(root,pathname.replace(/^\//,""));
  if(!target.startsWith(root)){res.writeHead(403);res.end();return}
  try{
    const stat=fs.statSync(target);
    const file=stat.isDirectory()?path.join(target,"index.html"):target;
    res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream"});
    fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404);res.end("not found")}
});
await new Promise(r=>server.listen(port,"127.0.0.1",r));

const url=`http://127.0.0.1:${port}/82trade-motion-lab/reading-v27-book-carousel-donor.html?qa=1`;
const report={};

async function run(name,viewport,reduced=false){
  const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader"]});
  const context=await browser.newContext({viewport,reducedMotion:reduced?"reduce":"no-preference"});
  const page=await context.newPage();
  const errors=[]; const failed=[];
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("requestfailed",r=>failed.push({url:r.url(),error:r.failure()?.errorText||null}));
  const response=await page.goto(url,{waitUntil:"networkidle",timeout:30000});
  await page.waitForSelector("canvas",{timeout:15000});
  await page.waitForTimeout(900);

  const initial=await page.evaluate(()=>({
    title:document.querySelector("#title")?.textContent?.trim(),
    count:document.querySelector("#count")?.textContent?.trim(),
    canvas:document.querySelector("canvas")?.getBoundingClientRect().toJSON(),
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    webgl:!!document.querySelector("canvas")?.getContext("webgl2") || !!document.querySelector("canvas")?.getContext("webgl"),
  }));
  await page.screenshot({path:path.join(out,`${name}-initial.png`),fullPage:false});

  const box=await page.locator("canvas").boundingBox();
  if(box){
    const y=box.y+box.height*.52;
    await page.mouse.move(box.x+box.width*.64,y);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width*.35,y,{steps:12});
    await page.mouse.up();
    await page.waitForTimeout(reduced?250:1200);
  }
  const afterDrag=await page.evaluate(()=>({
    title:document.querySelector("#title")?.textContent?.trim(),
    count:document.querySelector("#count")?.textContent?.trim(),
  }));
  await page.screenshot({path:path.join(out,`${name}-after-drag.png`),fullPage:false});

  report[name]={status:response?.status()??null,errors,failed,initial,afterDrag};
  await browser.close();
}

await run("desktop",{width:1440,height:900},false);
await run("mobile",{width:390,height:844},false);
await run("reduced",{width:1440,height:900},true);

for(const [name,r] of Object.entries(report)){
  if(r.status!==200)throw new Error(`${name}: status ${r.status}`);
  if(r.errors.length)throw new Error(`${name}: console/page errors: ${r.errors.join(" | ")}`);
  if(r.failed.length)throw new Error(`${name}: request failures: ${JSON.stringify(r.failed)}`);
  if(!r.initial.webgl)throw new Error(`${name}: WebGL unavailable`);
  if(r.initial.scrollWidth!==r.initial.clientWidth)throw new Error(`${name}: horizontal overflow`);
  if(!r.initial.title)throw new Error(`${name}: initial title missing`);
  if(!r.afterDrag.title)throw new Error(`${name}: post-drag title missing`);
}
if(report.desktop.afterDrag.title===report.desktop.initial.title){
  throw new Error("desktop drag did not advance the selected book");
}
fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await new Promise(r=>server.close(r));

import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const out="original-upgrade-v1-qa";
fs.mkdirSync(out,{recursive:true});
const port=4261;
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp"};

const server=http.createServer((req,res)=>{
  const u=new URL(req.url,`http://127.0.0.1:${port}`);
  let p=decodeURIComponent(u.pathname.replace(/^\//,""));
  let target=path.resolve(root,p||"index.html");
  if(!target.startsWith(root)){res.writeHead(403);res.end();return}
  try{
    const st=fs.statSync(target);
    if(st.isDirectory()) target=path.join(target,"index.html");
    res.writeHead(200,{"content-type":mime[path.extname(target).toLowerCase()]||"application/octet-stream"});
    fs.createReadStream(target).pipe(res);
  }catch{res.writeHead(404);res.end("not found")}
});
await new Promise(r=>server.listen(port,"127.0.0.1",r));

const url=`http://127.0.0.1:${port}/82trade-motion-lab/original-upgrade-v1.html`;
const report={};

async function capture(name, viewport, reduced=false){
  const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader"]});
  const context=await browser.newContext({viewport,reducedMotion:reduced?"reduce":"no-preference"});
  const page=await context.newPage();
  const errors=[];
  const failed=[];
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("requestfailed",r=>failed.push({url:r.url(),error:r.failure()?.errorText||null}));
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForTimeout(2500);

  const initial=await page.evaluate(()=>({
    title:document.title,
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
    scrollHeight:document.documentElement.scrollHeight,
    h1:document.querySelector("h1")?.textContent?.trim(),
    cards:document.querySelectorAll(".card").length,
    faces:document.querySelectorAll(".community-stack a").length
  }));
  await page.screenshot({path:path.join(out,`${name}-hero.png`),fullPage:false});

  if(!reduced && viewport.width>=1000){
    const face=page.locator(".community-stack a").nth(2);
    await face.hover();
    await page.waitForTimeout(450);
    await page.screenshot({path:path.join(out,`${name}-avatar-hover.png`),fullPage:false});

    const card=page.locator(".card").first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    await card.hover();
    await page.waitForTimeout(450);
    await page.screenshot({path:path.join(out,`${name}-card-hover.png`),fullPage:false});
  }

  report[name]={status:response?.status()??null,errors,failed,initial};
  await browser.close();
}

await capture("desktop",{width:1440,height:900},false);
await capture("mobile",{width:390,height:844},false);
await capture("reduced",{width:1440,height:900},true);

for(const [name,r] of Object.entries(report)){
  if(r.status!==200) throw new Error(`${name}: HTTP ${r.status}`);
  if(r.initial.scrollWidth!==r.initial.clientWidth) throw new Error(`${name}: horizontal overflow`);
  if(r.initial.cards!==3) throw new Error(`${name}: expected 3 learning cards`);
  if(r.initial.faces!==6) throw new Error(`${name}: expected 6 hero social-proof faces`);
  if(r.errors.length) throw new Error(`${name}: page errors: ${r.errors.join(" | ")}`);
}
fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await new Promise(r=>server.close(r));

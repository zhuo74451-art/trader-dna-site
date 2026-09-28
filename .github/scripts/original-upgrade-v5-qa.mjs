import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd(),out="original-upgrade-v5-qa",port=4265;
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

const specs=[
 {key:"home",file:"original-upgrade-v5-team-review.html"},
 {key:"learn",file:"original-learn-v2.html"},
 {key:"community",file:"original-community-v2.html"}
];
const report={};

async function run(spec,viewport,label){
  const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader"]});
  const context=await browser.newContext({viewport});
  const page=await context.newPage();
  const errors=[],failed=[];
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("requestfailed",r=>failed.push({url:r.url(),error:r.failure()?.errorText||null}));
  const url=`http://127.0.0.1:${port}/82trade-motion-lab/${spec.file}`;
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForTimeout(2200);
  const state=await page.evaluate(()=>({
    title:document.title,
    sw:document.documentElement.scrollWidth,
    cw:document.documentElement.clientWidth,
    sh:document.documentElement.scrollHeight,
    h1:document.querySelector("h1")?.textContent?.trim(),
    firstCardTop:document.querySelector(".content-card")?.getBoundingClientRect().top ?? null,
    firstFlowTop:document.querySelector(".step")?.getBoundingClientRect().top ?? null
  }));
  report[`${spec.key}-${label}`]={status:response?.status()??null,errors,failed,state};
  await page.screenshot({path:path.join(out,`${spec.key}-${label}.png`)});

  if(spec.key==="home"&&label==="desktop"){
    await page.locator(".community-stack a").nth(2).hover();await page.waitForTimeout(350);
    await page.screenshot({path:path.join(out,"home-avatar-hover.png")});
  }
  if(spec.key==="learn"&&label==="desktop"){
    await page.locator('[data-filter="method"]').click();await page.waitForTimeout(200);
    report.learnFilter={visible:await page.locator(".content-card:visible").count()};
    await page.screenshot({path:path.join(out,"learn-method-filter.png")});
  }
  await browser.close();
}

for(const spec of specs){
  await run(spec,{width:1440,height:900},"desktop");
  await run(spec,{width:390,height:844},"mobile");
}
for(const [name,r] of Object.entries(report)){
  if(!r||!("status" in r))continue;
  if(r.status!==200)throw new Error(`${name}: HTTP ${r.status}`);
  if(r.state.sw!==r.state.cw)throw new Error(`${name}: overflow ${r.state.sw}/${r.state.cw}`);
  if(r.errors.length)throw new Error(`${name}: ${r.errors.join(" | ")}`);
}
if(report.learnFilter?.visible!==2)throw new Error(`learn filter expected 2 visible cards, got ${report.learnFilter?.visible}`);
if((report["learn-desktop"]?.state.firstCardTop??9999)>900)throw new Error("learn content does not enter first desktop viewport");
if((report["community-desktop"]?.state.firstFlowTop??9999)>950)throw new Error("community flow starts too late on desktop");
fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await new Promise(r=>server.close(r));

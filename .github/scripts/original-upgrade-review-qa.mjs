import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd(),out="original-upgrade-review-qa",port=4264;
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

const pages=[
  {key:"home",file:"original-upgrade-v4-team-review.html"},
  {key:"learn",file:"original-learn-v1.html"},
  {key:"community",file:"original-community-v1.html"}
];
const report={};

async function check(spec,viewport,label){
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
  const state=await page.evaluate(()=>({title:document.title,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,h1:document.querySelector("h1")?.textContent?.trim()}));
  await page.screenshot({path:path.join(out,`${spec.key}-${label}.png`)});
  report[`${spec.key}-${label}`]={status:response?.status()??null,errors,failed,state};

  if(spec.key==="learn"&&label==="desktop"){
    await page.locator('[data-filter="method"]').click();
    await page.waitForTimeout(250);
    const visible=await page.locator(".content-card:visible").count();
    report.learnFilter={visible};
    await page.screenshot({path:path.join(out,"learn-filter-method.png")});
  }
  if(spec.key==="home"&&label==="desktop"){
    await page.locator(".community-stack a").nth(2).hover();
    await page.waitForTimeout(350);
    await page.screenshot({path:path.join(out,"home-avatar-hover.png")});
  }
  await browser.close();
}

for(const spec of pages){
  await check(spec,{width:1440,height:900},"desktop");
  await check(spec,{width:390,height:844},"mobile");
}
for(const [name,r] of Object.entries(report)){
  if(!r||!("status" in r))continue;
  if(r.status!==200)throw new Error(`${name}: HTTP ${r.status}`);
  if(r.state.sw!==r.state.cw)throw new Error(`${name}: horizontal overflow ${r.state.sw}/${r.state.cw}`);
  if(r.errors.length)throw new Error(`${name}: ${r.errors.join(" | ")}`);
}
if(report.learnFilter?.visible!==2)throw new Error(`learn filter expected 2 method cards, got ${report.learnFilter?.visible}`);
fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await new Promise(r=>server.close(r));

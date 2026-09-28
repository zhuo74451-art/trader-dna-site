import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd(),out="original-upgrade-v6-qa",port=4266;
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
 {key:"home",file:"original-upgrade-v6-team-review.html"},
 {key:"learn",file:"original-learn-v2.html"},
 {key:"community",file:"original-community-v2.html"},
 {key:"academy",file:"original-academy-v1.html"},
 {key:"detail",file:"original-course-detail-v1.html"},
 {key:"dna",file:"original-trader-dna-v1.html"}
];
const report={};

async function run(spec,viewport,label,reduced=false){
  const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader"]});
  const context=await browser.newContext({viewport,reducedMotion:reduced?"reduce":"no-preference"});
  const page=await context.newPage();
  const errors=[],failed=[];
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("requestfailed",r=>{
    const u=r.url();
    if(/82trade\.com\/brand\//.test(u))return;
    failed.push({url:u,error:r.failure()?.errorText||null});
  });
  const url=`http://127.0.0.1:${port}/82trade-motion-lab/${spec.file}`;
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForTimeout(2200);
  const state=await page.evaluate(()=>({
    title:document.title,
    sw:document.documentElement.scrollWidth,
    cw:document.documentElement.clientWidth,
    sh:document.documentElement.scrollHeight,
    h1:document.querySelector("h1")?.textContent?.trim(),
    reduced:matchMedia("(prefers-reduced-motion: reduce)").matches
  }));
  report[`${spec.key}-${label}`]={status:response?.status()??null,errors,failed,state};
  await page.screenshot({path:path.join(out,`${spec.key}-${label}.png`)});

  if(!reduced&&label==="desktop"){
    if(spec.key==="home"){
      await page.locator("#products").scrollIntoViewIfNeeded();await page.waitForTimeout(300);
      await page.locator(".product-card").first().hover();await page.waitForTimeout(300);
      report.homeProducts={count:await page.locator(".product-card").count()};
      await page.screenshot({path:path.join(out,"home-products.png")});
    }
    if(spec.key==="academy"){
      const feature=page.locator(".feature-card").nth(1);await feature.hover();await page.waitForTimeout(350);
      report.academyFeature={active:await feature.evaluate(el=>el.classList.contains("is-active"))};
      await page.locator('[data-filter="structure"]').click();await page.waitForTimeout(200);
      report.academyFilter={visible:await page.locator(".course-card:visible").count()};
      await page.screenshot({path:path.join(out,"academy-filter-structure.png")});
    }
    if(spec.key==="detail"){
      const second=page.locator("#outline details").nth(1);await second.locator("summary").click();await page.waitForTimeout(200);
      report.detailAccordion={open:await second.evaluate(el=>el.open)};
      await page.screenshot({path:path.join(out,"detail-outline-open.png")});
    }
    if(spec.key==="dna"){
      const third=page.locator(".archive-card").nth(2);await third.hover();await page.waitForTimeout(320);
      report.dnaArchive={active:await third.evaluate(el=>el.classList.contains("is-active")),name:await page.locator(".identity-copy strong").textContent()};
      const secondChoice=page.locator(".choice button").nth(1);await secondChoice.click();
      report.dnaChoice={active:await secondChoice.evaluate(el=>el.classList.contains("is-active"))};
      await page.screenshot({path:path.join(out,"dna-archive-third.png")});
    }
    if(spec.key==="learn"){
      await page.locator('[data-filter="method"]').click();await page.waitForTimeout(200);
      report.learnFilter={visible:await page.locator(".content-card:visible").count()};
    }
  }
  await browser.close();
}

for(const spec of specs){
  await run(spec,{width:1440,height:900},"desktop",false);
  await run(spec,{width:390,height:844},"mobile",false);
  await run(spec,{width:1440,height:900},"reduced",true);
}
for(const [name,r] of Object.entries(report)){
  if(!r||!("status" in r))continue;
  if(r.status!==200)throw new Error(`${name}: HTTP ${r.status}`);
  if(r.state.sw!==r.state.cw)throw new Error(`${name}: overflow ${r.state.sw}/${r.state.cw}`);
  if(r.errors.length)throw new Error(`${name}: page errors ${r.errors.join(" | ")}`);
}
if(report.homeProducts?.count!==2)throw new Error("home product layer missing");
if(!report.academyFeature?.active)throw new Error("academy featured interaction failed");
if(report.academyFilter?.visible!==1)throw new Error(`academy structure filter expected 1 card, got ${report.academyFilter?.visible}`);
if(!report.detailAccordion?.open)throw new Error("detail accordion failed");
if(!report.dnaArchive?.active||report.dnaArchive?.name!=="Warren Buffett")throw new Error("DNA archive selection failed");
if(!report.dnaChoice?.active)throw new Error("DNA choice response failed");
if(report.learnFilter?.visible!==2)throw new Error("learn filter failed");
for(const spec of specs){if(!report[`${spec.key}-reduced`]?.state.reduced)throw new Error(`${spec.key}: reduced motion context not active`)}
fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await new Promise(r=>server.close(r));

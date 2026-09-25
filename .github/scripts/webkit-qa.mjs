import { webkit } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const port = 4181;

const mime = {
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".mp4":"video/mp4",
};

const server = http.createServer((req,res)=>{
  let pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
  if (pathname === "/82trade-brand-master" || pathname === "/82trade-brand-master/") {
    pathname = "/82trade-brand-master/index.html";
  }
  let target = path.join(root, pathname.replace(/^\//,""));
  if (!target.startsWith(root)) {
    res.writeHead(403); res.end(); return;
  }
  try {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) target = path.join(target,"index.html");
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200,{"content-type":mime[ext]||"application/octet-stream"});
    fs.createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});
await new Promise(resolve=>server.listen(port,"127.0.0.1",resolve));

const report = {};
const shots = "webkit-qa";
fs.mkdirSync(shots,{recursive:true});

async function run(name, viewport, reduced=false) {
  const browser = await webkit.launch({headless:true});
  const context = await browser.newContext({viewport,reducedMotion:reduced?"reduce":"no-preference"});
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on("console", msg=>{ if(msg.type()==="error") errors.push(msg.text()); });
  page.on("pageerror", err=>errors.push(err.message));
  page.on("requestfailed", req=>{
    const u=req.url();
    if(!u.startsWith("data:")) failed.push({url:u,error:req.failure()?.errorText||null});
  });

  const response = await page.goto(`http://127.0.0.1:${port}/82trade-brand-master/`,{waitUntil:"networkidle",timeout:30000});
  await page.waitForSelector("h1",{timeout:15000});

  const state = await page.evaluate(()=>({
    title:document.title,
    h1:document.querySelector("h1")?.textContent?.replace(/\s+/g," ").trim(),
    clientWidth:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    scrollHeight:document.documentElement.scrollHeight,
    highlightCount:document.querySelectorAll(".highlightCard").length,
    activeHighlight:Array.from(document.querySelectorAll(".highlightCard")).findIndex(el=>el.getAttribute("data-active")==="true"),
  }));

  await page.locator("#highlights").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(shots,`${name}-highlights.png`),fullPage:false});

  const before = await page.locator(".highlightsTrack").evaluate(el=>el.scrollLeft);
  await page.locator('[data-highlight-page="2"]').click();
  await page.waitForTimeout(700);
  const afterPage3 = await page.locator(".highlightsTrack").evaluate(el=>el.scrollLeft);
  const activePage3 = await page.locator(".highlightCard").evaluateAll(els=>els.findIndex(el=>el.getAttribute("data-active")==="true"));

  await page.locator('[data-highlight-dir="1"]').click();
  await page.waitForTimeout(700);
  const afterNext = await page.locator(".highlightsTrack").evaluate(el=>el.scrollLeft);
  const activeNext = await page.locator(".highlightCard").evaluateAll(els=>els.findIndex(el=>el.getAttribute("data-active")==="true"));

  if (viewport.width <= 500) {
    await page.locator("details.mobileMenu > summary").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
  }
  const mobileMenuOpen = viewport.width <= 500
    ? await page.locator("details.mobileMenu").evaluate(el=>el.hasAttribute("open"))
    : null;

  await page.locator("#master-top").scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(shots,`${name}-hero.png`),fullPage:false});

  report[name] = {
    status:response?.status()??null,
    errors,
    failed,
    ...state,
    highlights:{before,afterPage3,activePage3,afterNext,activeNext},
    mobileMenuOpen,
  };
  await browser.close();
}

await run("desktop-1440",{width:1440,height:900},false);
await run("mobile-390",{width:390,height:844},false);
await run("desktop-reduced",{width:1440,height:900},true);

fs.writeFileSync(path.join(shots,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

for (const [name,r] of Object.entries(report)) {
  if (r.status !== 200) throw new Error(`${name}: status ${r.status}`);
  if (!r.h1?.includes("READ THE")) throw new Error(`${name}: hero missing`);
  if (r.errors.length) throw new Error(`${name}: console/page errors: ${r.errors.join(" | ")}`);
  if (r.failed.length) throw new Error(`${name}: request failures: ${JSON.stringify(r.failed.slice(0,5))}`);
  if (r.scrollWidth !== r.clientWidth) throw new Error(`${name}: horizontal overflow ${r.scrollWidth}/${r.clientWidth}`);
  if (r.highlightCount !== 4) throw new Error(`${name}: highlight count ${r.highlightCount}`);
  if (r.highlights.activePage3 !== 2) throw new Error(`${name}: page3 active index ${r.highlights.activePage3}`);
  if (r.highlights.activeNext !== 3) throw new Error(`${name}: next active index ${r.highlights.activeNext}`);
}
if (!report["mobile-390"].mobileMenuOpen) throw new Error("mobile WebKit menu did not open by keyboard");

await new Promise(resolve=>server.close(resolve));

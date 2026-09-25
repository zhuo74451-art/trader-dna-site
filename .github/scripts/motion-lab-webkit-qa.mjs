import { webkit } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const port = 4183;
const out = "motion-lab-webkit";
fs.mkdirSync(out, { recursive: true });

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
  if (pathname === "/82trade-motion-lab" || pathname === "/82trade-motion-lab/") {
    pathname = "/82trade-motion-lab/index.html";
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

async function run(name, viewport, reduced=false) {
  const browser = await webkit.launch({ headless:true });
  const context = await browser.newContext({
    viewport,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  const errors = [];
  const failed = [];

  page.on("console", msg=>{ if(msg.type()==="error") errors.push(msg.text()); });
  page.on("pageerror", err=>errors.push(err.message));
  page.on("requestfailed", req=>{
    const u=req.url();
    if(!u.startsWith("data:")) failed.push({url:u,error:req.failure()?.errorText||null});
  });

  const response = await page.goto(
    `http://127.0.0.1:${port}/82trade-motion-lab/`,
    { waitUntil:"networkidle", timeout:30000 }
  );
  await page.waitForSelector("h1",{timeout:15000});
  await page.waitForTimeout(850);

  const baseState = await page.evaluate(()=>({
    title:document.title,
    h1:document.querySelector("h1")?.textContent?.replace(/\s+/g," ").trim(),
    clientWidth:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    scrollHeight:document.documentElement.scrollHeight,
    highlightCount:document.querySelectorAll(".highlightCard").length,
  }));

  const scrollAndShot = async (selector, file, offset=0) => {
    const top = await page.locator(selector).evaluate(el => window.scrollY + el.getBoundingClientRect().top);
    await page.evaluate(({top,offset})=>window.scrollTo({top:Math.max(0,top+offset),behavior:"instant"}),{top,offset});
    await page.waitForTimeout(reduced ? 180 : 650);
    await page.screenshot({path:path.join(out,file),fullPage:false});
  };

  if (viewport.width >= 900) {
    const worldviewTop = await page.locator("#worldview").evaluate(el => window.scrollY + el.getBoundingClientRect().top);
    await page.evaluate(top=>window.scrollTo({top:Math.max(0,top-300),behavior:"instant"}),worldviewTop);
    await page.waitForTimeout(650);
    await page.screenshot({path:path.join(out,`${name}-real-to-worldview.png`),fullPage:false});

    const highlightsTop = await page.locator("#highlights").evaluate(el => window.scrollY + el.getBoundingClientRect().top);
    await page.evaluate(top=>window.scrollTo({top:Math.max(0,top-300),behavior:"instant"}),highlightsTop);
    await page.waitForTimeout(650);
    await page.screenshot({path:path.join(out,`${name}-worldview-to-highlights.png`),fullPage:false});

    await scrollAndShot("#academy",`${name}-academy.png`,-200);
    await scrollAndShot("#trader-dna",`${name}-dna.png`,-220);
  } else {
    for (const [selector,label] of [
      ["#master-top","hero"],
      ["#worldview","worldview"],
      ["#highlights","highlights"],
      ["#academy","academy"],
      ["#trader-dna","dna"],
      ["#enter","closing"],
    ]) {
      await scrollAndShot(selector,`${name}-${label}.png`,-90);
    }
  }

  await page.locator("#highlights").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const before = await page.locator(".highlightsTrack").evaluate(el=>el.scrollLeft);
  await page.locator('[data-highlight-page="2"]').click();
  await page.waitForTimeout(reduced ? 100 : 700);
  const afterPage3 = await page.locator(".highlightsTrack").evaluate(el=>el.scrollLeft);
  const activePage3 = await page.locator(".highlightCard").evaluateAll(els=>els.findIndex(el=>el.getAttribute("data-active")==="true"));

  await page.locator('[data-highlight-dir="1"]').click();
  await page.waitForTimeout(reduced ? 100 : 700);
  const afterNext = await page.locator(".highlightsTrack").evaluate(el=>el.scrollLeft);
  const activeNext = await page.locator(".highlightCard").evaluateAll(els=>els.findIndex(el=>el.getAttribute("data-active")==="true"));

  let mobileMenuOpen = null;
  if (viewport.width <= 500) {
    await page.locator("details.mobileMenu > summary").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(120);
    mobileMenuOpen = await page.locator("details.mobileMenu").evaluate(el=>el.hasAttribute("open"));
  }

  const finalState = await page.evaluate(()=>({
    clientWidth:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth,
    headerTheme:document.querySelector(".header")?.getAttribute("data-theme") ?? null,
    headerCompact:document.querySelector(".header")?.getAttribute("data-compact") ?? null,
  }));

  report[name] = {
    status: response?.status() ?? null,
    errors,
    failed,
    ...baseState,
    finalState,
    highlights:{before,afterPage3,activePage3,afterNext,activeNext},
    mobileMenuOpen,
  };

  await browser.close();
}

await run("desktop-1440",{width:1440,height:900},false);
await run("mobile-390",{width:390,height:844},false);
await run("desktop-reduced",{width:1440,height:900},true);

fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

for (const [name,r] of Object.entries(report)) {
  if (r.status !== 200) throw new Error(`${name}: status ${r.status}`);
  if (!r.h1?.includes("READ THE")) throw new Error(`${name}: hero missing`);
  if (r.errors.length) throw new Error(`${name}: console/page errors: ${r.errors.join(" | ")}`);
  if (r.failed.length) throw new Error(`${name}: request failures: ${JSON.stringify(r.failed.slice(0,5))}`);
  if (r.finalState.scrollWidth !== r.finalState.clientWidth) {
    throw new Error(`${name}: horizontal overflow ${r.finalState.scrollWidth}/${r.finalState.clientWidth}`);
  }
  if (r.highlightCount !== 4) throw new Error(`${name}: highlight count ${r.highlightCount}`);
  if (r.highlights.activePage3 !== 2) throw new Error(`${name}: page3 active index ${r.highlights.activePage3}`);
  if (r.highlights.activeNext !== 3) throw new Error(`${name}: next active index ${r.highlights.activeNext}`);
}
if (!report["mobile-390"].mobileMenuOpen) throw new Error("mobile WebKit menu did not open by keyboard");

await new Promise(resolve=>server.close(resolve));

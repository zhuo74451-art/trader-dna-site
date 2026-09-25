import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const browserPath = process.env.BROWSER;
if (!browserPath) throw new Error("BROWSER env is required");

const outDir = path.resolve("reading-study-qa");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: browserPath,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const errors = [];
const failures = [];

async function open(name, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push({ name, text: msg.text() });
  });
  page.on("pageerror", (err) => errors.push({ name, text: err.message }));
  page.on("requestfailed", (req) => {
    failures.push({ name, url: req.url(), error: req.failure()?.errorText ?? null });
  });
  await page.setCacheEnabled(false);
  const response = await page.goto("http://127.0.0.1:4174/82trade-motion-lab/reading-v5.html", {
    waitUntil: "networkidle0",
    timeout: 30000,
  });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await new Promise((resolve) => setTimeout(resolve, 450));
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });

  const state = await page.evaluate(() => {
    const book = document.querySelector(".book");
    const title = document.querySelector("h1");
    const selected = document.querySelector('[data-selected="true"]');
    const bookRect = book instanceof HTMLElement ? book.getBoundingClientRect() : null;
    const titleRect = title instanceof HTMLElement ? title.getBoundingClientRect() : null;
    return {
      statusText: document.title,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bookRect: bookRect ? { x: bookRect.x, y: bookRect.y, width: bookRect.width, height: bookRect.height } : null,
      titleRect: titleRect ? { x: titleRect.x, y: titleRect.y, width: titleRect.width, height: titleRect.height } : null,
      selectedText: selected?.textContent?.trim() ?? null,
      imageComplete: document.querySelector(".front img") instanceof HTMLImageElement
        ? document.querySelector(".front img").complete
        : false,
    };
  });
  await page.close();
  if (![200, 304].includes(response?.status() ?? 0)) {
    throw new Error(`${name}: status ${response?.status()}`);
  }
  return state;
}

const report = {
  desktop1512: await open("reading-v5-desktop-1512", { width: 1512, height: 982, deviceScaleFactor: 1 }),
  desktop1440: await open("reading-v5-desktop-1440", { width: 1440, height: 900, deviceScaleFactor: 1 }),
  mobile390: await open("reading-v5-mobile-390", { width: 390, height: 844, deviceScaleFactor: 1 }),
};

report.errors = errors;
report.failures = failures;
fs.writeFileSync(path.join(outDir, "diagnostics.json"), JSON.stringify(report, null, 2));

for (const [name, state] of Object.entries(report)) {
  if (!state || typeof state !== "object" || !("clientWidth" in state)) continue;
  if (state.scrollWidth !== state.clientWidth) {
    throw new Error(`${name}: horizontal overflow ${state.scrollWidth}/${state.clientWidth}`);
  }
  if (!state.imageComplete) throw new Error(`${name}: book image not complete`);
}
if (errors.length) throw new Error(`console/page errors: ${JSON.stringify(errors)}`);
if (failures.length) throw new Error(`request failures: ${JSON.stringify(failures)}`);

console.log(JSON.stringify(report, null, 2));
await browser.close();

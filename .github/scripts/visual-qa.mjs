import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const browserPath = process.env.BROWSER;
if (!browserPath) throw new Error("BROWSER env is required");

const outDir = path.resolve("qa-snapshots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: browserPath,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const base = "http://127.0.0.1:4173/82trade-brand-master/";
const consoleErrors = [];
const imageErrors = [];
const diagnostics = {};

async function waitForPage(page) {
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            }),
      ),
    );
  });
}

async function openPage(viewport, reducedMotion = true) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  if (reducedMotion) {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
  }
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("requestfailed", (req) => {
    imageErrors.push({ url: req.url(), error: req.failure()?.errorText ?? "failed" });
  });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 20000 });
  await waitForPage(page);
  return page;
}

async function sceneShot(page, name, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Missing selector: ${sel}`);
    const y = window.scrollY + el.getBoundingClientRect().top;
    window.scrollTo({ top: y, behavior: "instant" });
  }, selector);
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: false,
  });
}

const desktop = await openPage({ width: 1440, height: 900, deviceScaleFactor: 1 }, true);
for (const [name, selector] of [
  ["hero-desktop", "#master-top"],
  ["real-world-desktop", "#real-world"],
  ["worldview-desktop", "#worldview"],
  ["highlights-desktop", "#highlights"],
  ["academy-desktop", "#academy"],
  ["trader-dna-desktop", "#trader-dna"],
  ["enter-desktop", "#enter"],
]) {
  await sceneShot(desktop, name, selector);
}

await desktop.evaluate(() => {
  const section = document.querySelector("#highlights");
  if (section) {
    const y = window.scrollY + section.getBoundingClientRect().top;
    window.scrollTo({ top: y, behavior: "instant" });
  }
});
await new Promise((r) => setTimeout(r, 200));
await sceneShot(desktop, "highlights-before-interaction", "#highlights");
const highlightInteraction = await desktop.evaluate(() => {
  const track = document.querySelector(".highlightsTrack");
  const before = track instanceof HTMLElement ? track.scrollLeft : null;
  document.querySelector('[data-highlight-page="2"]')?.click();
  return { before };
});
await new Promise((r) => setTimeout(r, 650));
highlightInteraction.afterPage3 = await desktop.evaluate(() => {
  const track = document.querySelector(".highlightsTrack");
  return {
    scrollLeft: track instanceof HTMLElement ? track.scrollLeft : null,
    activeIndex: Array.from(document.querySelectorAll(".highlightCard")).findIndex(
      (el) => el.getAttribute("data-active") === "true",
    ),
  };
});
await desktop.screenshot({
  path: path.join(outDir, "highlights-page3-desktop.png"),
  fullPage: false,
});
await desktop.click('[data-highlight-dir="1"]');
await new Promise((r) => setTimeout(r, 650));
highlightInteraction.afterNext = await desktop.evaluate(() => {
  const track = document.querySelector(".highlightsTrack");
  return {
    scrollLeft: track instanceof HTMLElement ? track.scrollLeft : null,
    activeIndex: Array.from(document.querySelectorAll(".highlightCard")).findIndex(
      (el) => el.getAttribute("data-active") === "true",
    ),
  };
});
diagnostics.highlightInteraction = highlightInteraction;

diagnostics.desktop = await desktop.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
  images: Array.from(document.images).map((img) => ({
    src: img.currentSrc || img.src,
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  })),
  activeHighlight:
    Array.from(document.querySelectorAll(".highlightCard")).findIndex(
      (el) => el.getAttribute("data-active") === "true",
    ),
  disabledButtons: Array.from(document.querySelectorAll("button:disabled")).map(
    (el) => el.getAttribute("aria-label") || el.textContent?.trim(),
  ),
}));
await desktop.close();

const mobile = await openPage({ width: 390, height: 844, deviceScaleFactor: 1 }, true);
for (const [name, selector] of [
  ["hero-mobile", "#master-top"],
  ["real-world-mobile", "#real-world"],
  ["worldview-mobile", "#worldview"],
  ["highlights-mobile", "#highlights"],
  ["academy-mobile", "#academy"],
  ["trader-dna-mobile", "#trader-dna"],
  ["enter-mobile", "#enter"],
]) {
  await sceneShot(mobile, name, selector);
}
diagnostics.mobile = await mobile.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
}));
await mobile.close();

const motion = await openPage({ width: 1440, height: 900, deviceScaleFactor: 1 }, false);
await motion.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await new Promise((r) => setTimeout(r, 1300));
await motion.screenshot({
  path: path.join(outDir, "hero-motion-final.png"),
  fullPage: false,
});
await motion.evaluate(() => {
  const section = document.querySelector("#real-world");
  if (section) {
    const y = window.scrollY + section.getBoundingClientRect().top + section.clientHeight * 0.35;
    window.scrollTo({ top: y, behavior: "instant" });
  }
});
await new Promise((r) => setTimeout(r, 700));
await motion.screenshot({
  path: path.join(outDir, "real-world-motion-mid.png"),
  fullPage: false,
});
await motion.close();

const referenceErrors = [];

async function captureReference(url, prefix, targets = []) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 5000));

    for (const label of ["Accept All Cookies", "Accept Cookies", "Allow all"]) {
      const clicked = await page.evaluate((text) => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const button = buttons.find((el) => el.textContent?.trim() === text);
        if (!button) return false;
        button.click();
        return true;
      }, label).catch(() => false);
      if (clicked) {
        await new Promise((r) => setTimeout(r, 500));
        break;
      }
    }

    await page.screenshot({
      path: path.join(outDir, `${prefix}-top.png`),
      fullPage: false,
    });

    for (const [name, text] of targets) {
      const found = await page.evaluate((needle) => {
        const candidates = Array.from(
          document.querySelectorAll("h1,h2,h3,h4,p,section,div"),
        ).filter((el) => (el.textContent || "").includes(needle));
        const target = candidates.sort(
          (a, b) => (a.textContent?.length || 0) - (b.textContent?.length || 0),
        )[0];
        if (!target) return false;
        const y = window.scrollY + target.getBoundingClientRect().top - 120;
        window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
        return true;
      }, text);

      if (!found) {
        referenceErrors.push({ url, target: text, error: "text_not_found" });
        continue;
      }

      await new Promise((r) => setTimeout(r, 900));
      await page.screenshot({
        path: path.join(outDir, `${prefix}-${name}.png`),
        fullPage: false,
      });
    }
  } catch (error) {
    referenceErrors.push({
      url,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await page.close();
  }
}

await captureReference("https://www.coinbase.com/onchain", "ref-coinbase", [
  ["imagine", "Let’s imagine a new internet"],
  ["vision", "Introducing Onchain Vision"],
  ["explore", "Explore onchain"],
]);

await captureReference("https://www.apple.com/macbook-pro/", "ref-apple", [
  ["highlights", "Get the highlights."],
  ["performance", "Pick your quick."],
]);

fs.writeFileSync(
  path.join(outDir, "diagnostics.json"),
  JSON.stringify({ consoleErrors, imageErrors, diagnostics, referenceErrors }, null, 2),
);

await browser.close();

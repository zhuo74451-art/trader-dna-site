import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const browserPath = process.env.BROWSER;
if (!browserPath) throw new Error("BROWSER env is required");

const outDir = path.resolve("motion-lab-qa");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: browserPath,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const base = "http://127.0.0.1:4174/82trade-motion-lab/";
const errors = [];
const failures = [];
const report = {};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function settle(page, ms = 450) {
  await sleep(ms);
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
}

async function openPage(viewport, reducedMotion = false, url = base) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.emulateMediaFeatures([
    {
      name: "prefers-reduced-motion",
      value: reducedMotion ? "reduce" : "no-preference",
    },
  ]);
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push({ viewport, text: msg.text() });
  });
  page.on("pageerror", (err) => errors.push({ viewport, text: err.message }));
  page.on("requestfailed", (req) => {
    failures.push({ viewport, url: req.url(), error: req.failure()?.errorText ?? null });
  });
  const response = await page.goto(url, {
    waitUntil: "networkidle0",
    timeout: 30000,
  });
  await settle(page, 650);
  return { page, status: response?.status() ?? null };
}

async function sectionTop(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!(el instanceof HTMLElement)) throw new Error(`Missing selector: ${sel}`);
    return window.scrollY + el.getBoundingClientRect().top;
  }, selector);
}

async function scrollTo(page, top, wait = 650) {
  await page.evaluate((value) => {
    window.scrollTo({ top: value, behavior: "instant" });
  }, Math.max(0, top));
  await settle(page, wait);
}

async function shot(page, name) {
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: false,
  });
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return Number(sorted[index].toFixed(2));
}

function metricDelta(before, after) {
  const keys = [
    "LayoutCount",
    "RecalcStyleCount",
    "LayoutDuration",
    "RecalcStyleDuration",
    "ScriptDuration",
    "TaskDuration",
    "JSHeapUsedSize",
  ];
  return Object.fromEntries(
    keys.map((key) => [key, Number(((after[key] ?? 0) - (before[key] ?? 0)).toFixed(4))]),
  );
}

async function sampleFramePacing(page, mode, frames = 90) {
  return page.evaluate(async ({ mode, frames }) => {
    const deltas = [];
    let last = performance.now();
    const track = document.querySelector(".highlightsTrack");
    const maxPage = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const maxTrack =
      track instanceof HTMLElement ? Math.max(0, track.scrollWidth - track.clientWidth) : 0;

    for (let i = 0; i < frames; i += 1) {
      await new Promise((resolve) => {
        requestAnimationFrame((now) => {
          if (i > 1) deltas.push(now - last);
          last = now;
          const progress = frames <= 1 ? 1 : i / (frames - 1);

          if (mode === "page") {
            window.scrollTo({ top: maxPage * progress, behavior: "instant" });
          } else if (track instanceof HTMLElement) {
            track.scrollLeft = maxTrack * progress;
          }

          resolve();
        });
      });
    }

    return {
      mode,
      frames: deltas.length,
      p50: 0,
      p95: 0,
      max: deltas.length ? Math.max(...deltas) : 0,
      over20ms: deltas.filter((value) => value > 20).length,
      over33ms: deltas.filter((value) => value > 33).length,
      raw: deltas,
    };
  }, { mode, frames });
}

async function state(page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    header: (() => {
      const el = document.querySelector(".header");
      if (!(el instanceof HTMLElement)) return null;
      const s = getComputedStyle(el);
      return {
        theme: el.dataset.theme ?? null,
        compact: el.dataset.compact ?? null,
        height: s.height,
        marginTop: s.marginTop,
        borderRadius: s.borderRadius,
      };
    })(),
    heroAccent: (() => {
      const el = document.querySelector(".heroAccent");
      if (!(el instanceof HTMLElement)) return null;
      const s = getComputedStyle(el);
      return { width: s.width, left: s.left, right: s.right };
    })(),
    heroGrid: (() => {
      const el = document.querySelector(".heroGrid");
      if (!(el instanceof HTMLElement)) return null;
      const s = getComputedStyle(el);
      return { opacity: s.opacity, transform: s.transform };
    })(),
    heroTitle: (() => {
      const el = document.querySelector(".heroTitle span");
      if (!(el instanceof HTMLElement)) return null;
      const s = getComputedStyle(el);
      return { color: s.color, opacity: s.opacity, transform: s.transform };
    })(),
    takeoverFrame: (() => {
      const el = document.querySelector(".takeoverFrame");
      if (!(el instanceof HTMLElement)) return null;
      const s = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        opacity: s.opacity,
        transform: s.transform,
        borderRadius: s.borderRadius,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    })(),
    worldviewSheet: (() => {
      const el = document.querySelector(".worldview");
      if (!(el instanceof HTMLElement)) return null;
      const s = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow,
      };
    })(),
    worldviewTitle: Array.from(document.querySelectorAll(".worldview h2 span")).map((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, opacity: s.opacity, transform: s.transform };
    }),
    highlightsSheet: (() => {
      const el = document.querySelector(".highlights");
      if (!(el instanceof HTMLElement)) return null;
      const s = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow,
      };
    })(),
    highlights: Array.from(document.querySelectorAll(".highlightCard")).map((el) => {
      const s = getComputedStyle(el);
      return {
        active: el.getAttribute("data-active"),
        opacity: s.opacity,
        transform: s.transform,
      };
    }),
    academy: (() => {
      const el = document.querySelector(".academyObject");
      if (!(el instanceof HTMLElement)) return null;
      const s = getComputedStyle(el);
      return { opacity: s.opacity, transform: s.transform };
    })(),
    dna: (() => {
      const el = document.querySelector(".registerFrame");
      if (!(el instanceof HTMLElement)) return null;
      const s = getComputedStyle(el);
      return {
        transform: s.transform,
        boxShadow: s.boxShadow,
      };
    })(),
  }));
}

const desktopOpen = await openPage({ width: 1440, height: 900, deviceScaleFactor: 1 }, false);
const desktop = desktopOpen.page;
await scrollTo(desktop, 0, 1350);
await shot(desktop, "desktop-01-hero-final");

const heroTop = await sectionTop(desktop, "#master-top");
const heroHeight = await desktop.evaluate(() => document.querySelector("#master-top")?.clientHeight ?? 900);
await scrollTo(desktop, heroTop + heroHeight * 0.7, 800);
await shot(desktop, "desktop-02-hero-handoff");
report.heroHandoff = await state(desktop);

const realTop = await sectionTop(desktop, "#real-world");
await scrollTo(desktop, realTop + 220, 700);
await shot(desktop, "desktop-03-real-world-entry");
await scrollTo(desktop, realTop + 760, 700);
await shot(desktop, "desktop-04-real-world-mid");

const worldviewTop = await sectionTop(desktop, "#worldview");
await scrollTo(desktop, worldviewTop - 300, 700);
await shot(desktop, "desktop-04b-real-to-worldview");
report.realToWorldview = await state(desktop);
await scrollTo(desktop, worldviewTop + 100, 700);
await shot(desktop, "desktop-05-worldview-start");
await scrollTo(desktop, worldviewTop + 420, 700);
await shot(desktop, "desktop-06-worldview-mid");
report.worldviewMid = await state(desktop);

const highlightsTop = await sectionTop(desktop, "#highlights");
await scrollTo(desktop, highlightsTop - 300, 650);
await shot(desktop, "desktop-06b-worldview-to-highlights");
report.worldviewToHighlights = await state(desktop);
await scrollTo(desktop, highlightsTop + 80, 650);
await shot(desktop, "desktop-07-highlights");
await desktop.evaluate(() => {
  const track = document.querySelector(".highlightsTrack");
  const cards = Array.from(document.querySelectorAll(".highlightCard"));
  if (!(track instanceof HTMLElement) || cards.length < 2) return;
  const first = cards[0];
  const second = cards[1];
  if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) return;
  const target = (first.offsetLeft + second.offsetLeft) / 2;
  track.scrollTo({ left: target, behavior: "instant" });
});
await settle(desktop, 450);
await shot(desktop, "desktop-08-highlights-mid-depth");
report.highlightsMid = await state(desktop);

const academyTop = await sectionTop(desktop, "#academy");
await scrollTo(desktop, academyTop - 360, 700);
await shot(desktop, "desktop-09-highlights-to-academy");
await scrollTo(desktop, academyTop + 260, 700);
await shot(desktop, "desktop-10-academy-stage");

const readingTop = await sectionTop(desktop, "#reading-list");
await scrollTo(desktop, readingTop - 320, 700);
await shot(desktop, "desktop-10b-academy-to-reading");
await scrollTo(desktop, readingTop + 220, 700);
await shot(desktop, "desktop-10c-reading-stage");

await desktop.evaluate(() => {
  document.querySelector('[data-reading-tab="1"]')?.scrollIntoView({
    block: "center",
    inline: "nearest",
  });
});
await settle(desktop, 220);
await desktop.click('[data-reading-tab="1"]');
await desktop.waitForFunction(
  () => document.querySelector("[data-reading-title]")?.textContent?.trim() === "新威科夫操盤法",
  { timeout: 2500 },
);
await scrollTo(desktop, readingTop + 220, 420);
await shot(desktop, "desktop-10d-reading-advanced");

await desktop.click('[data-reading-dir="1"]');
await desktop.waitForFunction(
  () => document.querySelector("[data-reading-title]")?.textContent?.trim() === "納瓦爾寶典",
  { timeout: 2500 },
);
await settle(desktop, 420);
await shot(desktop, "desktop-10e-reading-growth");
report.reading = await desktop.evaluate(() => ({
  title: document.querySelector("[data-reading-title]")?.textContent?.trim() ?? null,
  category: document.querySelector("[data-reading-category]")?.textContent?.trim() ?? null,
  activeTab: Array.from(document.querySelectorAll("[data-reading-tab]")).findIndex(
    (el) => el.getAttribute("data-active") === "true",
  ),
  image: document.querySelector("[data-reading-image]")?.getAttribute("src") ?? null,
}));

const dnaTop = await sectionTop(desktop, "#trader-dna");
await scrollTo(desktop, dnaTop - 320, 700);
await shot(desktop, "desktop-11-reading-to-dna");
await scrollTo(desktop, dnaTop + 260, 700);
await shot(desktop, "desktop-12-dna-reveal");

const dnaBox = await desktop.$(".registerFrame");
if (dnaBox) {
  const box = await dnaBox.boundingBox();
  if (box) {
    await desktop.mouse.move(box.x + box.width * 0.74, box.y + box.height * 0.28);
    await settle(desktop, 280);
    await shot(desktop, "desktop-13-dna-tilt");
    report.dnaTilt = await state(desktop);
  }
}

const closingTop = await sectionTop(desktop, "#enter");
await scrollTo(desktop, closingTop + 200, 700);
await shot(desktop, "desktop-14-closing");

const pageMetricsBefore = await desktop.metrics();
const pagePacing = await sampleFramePacing(desktop, "page");
const pageMetricsAfter = await desktop.metrics();

await scrollTo(desktop, highlightsTop + 80, 250);
await desktop.evaluate(() => {
  const track = document.querySelector(".highlightsTrack");
  if (track instanceof HTMLElement) track.scrollLeft = 0;
});
await settle(desktop, 180);

const highlightsMetricsBefore = await desktop.metrics();
const highlightsPacing = await sampleFramePacing(desktop, "highlights");
const highlightsMetricsAfter = await desktop.metrics();

for (const pacing of [pagePacing, highlightsPacing]) {
  pacing.p50 = percentile(pacing.raw, 0.5);
  pacing.p95 = percentile(pacing.raw, 0.95);
  pacing.max = Number(pacing.max.toFixed(2));
  delete pacing.raw;
}

report.motionPerf = {
  page: {
    pacing: pagePacing,
    metrics: metricDelta(pageMetricsBefore, pageMetricsAfter),
  },
  highlights: {
    pacing: highlightsPacing,
    metrics: metricDelta(highlightsMetricsBefore, highlightsMetricsAfter),
  },
};

await scrollTo(desktop, 1500, 250);
await scrollTo(desktop, 2600, 250);
report.headerDown = await state(desktop);
await scrollTo(desktop, 1800, 250);
report.headerUp = await state(desktop);
report.desktopFinal = await state(desktop);
await desktop.close();

const readingHashOpen = await openPage(
  { width: 1440, height: 900, deviceScaleFactor: 1 },
  false,
  `${base}?qa=reading-hash#reading-list`,
);
const readingHashPage = readingHashOpen.page;
await settle(readingHashPage, 1400);
await shot(readingHashPage, "desktop-10f-reading-direct-hash");
report.readingHashLanding = await readingHashPage.evaluate(() => {
  const target = document.getElementById("reading-list");
  const header = document.querySelector(".header");
  if (!(target instanceof HTMLElement)) return null;
  const targetRect = target.getBoundingClientRect();
  const headerRect = header instanceof HTMLElement ? header.getBoundingClientRect() : null;
  return {
    hash: window.location.hash,
    scrollY: window.scrollY,
    targetTop: targetRect.top,
    targetBottom: targetRect.bottom,
    headerBottom: headerRect?.bottom ?? null,
    title: target.querySelector("h2")?.textContent?.trim() ?? null,
  };
});
await readingHashPage.close();

const mobileOpen = await openPage({ width: 390, height: 844, deviceScaleFactor: 1 }, false);
const mobile = mobileOpen.page;
await scrollTo(mobile, 0, 1100);
await shot(mobile, "mobile-01-hero");

for (const [name, selector] of [
  ["mobile-01b-real-world", "#real-world"],
  ["mobile-02-worldview", "#worldview"],
  ["mobile-03-highlights", "#highlights"],
  ["mobile-04-academy", "#academy"],
  ["mobile-04b-reading", "#reading-list"],
  ["mobile-05-dna", "#trader-dna"],
  ["mobile-06-closing", "#enter"],
]) {
  const top = await sectionTop(mobile, selector);
  await scrollTo(mobile, top - 120, 550);
  await shot(mobile, name);
}

const mobileHighlightsTop = await sectionTop(mobile, "#highlights");
await scrollTo(mobile, mobileHighlightsTop - 120, 420);
report.mobileHighlightsEntry = await mobile.evaluate(() => {
  const sheet = document.querySelector(".highlights");
  const backing = document.querySelector(".worldviewBlue");
  if (!(sheet instanceof HTMLElement) || !(backing instanceof HTMLElement)) return null;
  const sheetStyle = getComputedStyle(sheet);
  const sheetRect = sheet.getBoundingClientRect();
  const backingRect = backing.getBoundingClientRect();
  return {
    viewportHeight: window.innerHeight,
    sheetTop: sheetRect.top,
    sheetRadius: sheetStyle.borderRadius,
    backingBottom: backingRect.bottom,
    overlapPx: Math.max(0, backingRect.bottom - sheetRect.top),
  };
});

const mobileDnaTop = await sectionTop(mobile, "#trader-dna");
await scrollTo(mobile, mobileDnaTop - 120, 420);
report.mobileDnaEntry = await mobile.evaluate(() => {
  const object = document.querySelector(".dnaHeroObject");
  const scan = document.querySelector(".registerScan");
  if (!(object instanceof HTMLElement)) return null;
  const rect = object.getBoundingClientRect();
  const scanStyle = scan instanceof HTMLElement ? getComputedStyle(scan) : null;
  return {
    viewportHeight: window.innerHeight,
    objectTop: rect.top,
    objectBottom: rect.bottom,
    visiblePx: Math.max(0, Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top)),
    objectVisibleState: object.dataset.visible ?? null,
    scanAnimationName: scanStyle?.animationName ?? null,
    scanOpacity: scanStyle?.opacity ?? null,
    scanTransform: scanStyle?.transform ?? null,
  };
});
await scrollTo(mobile, mobileDnaTop + 260, 420);
report.mobileDnaScanActive = await mobile.evaluate(() => {
  const object = document.querySelector(".dnaHeroObject");
  const scan = document.querySelector(".registerScan");
  if (!(object instanceof HTMLElement) || !(scan instanceof HTMLElement)) return null;
  const scanStyle = getComputedStyle(scan);
  return {
    objectVisibleState: object.dataset.visible ?? null,
    scanAnimationName: scanStyle.animationName,
    scanOpacity: scanStyle.opacity,
    scanTransform: scanStyle.transform,
  };
});
await shot(mobile, "mobile-05b-dna-object");

await mobile.focus("details.mobileMenu > summary");
await mobile.keyboard.press("Enter");
await settle(mobile, 180);
await shot(mobile, "mobile-07-menu-open");
report.mobile = {
  ...(await state(mobile)),
  menuOpen: await mobile.evaluate(
    () => document.querySelector("details.mobileMenu")?.hasAttribute("open") ?? false,
  ),
};
await mobile.close();

const narrowOpen = await openPage({ width: 360, height: 800, deviceScaleFactor: 1 }, false);
const narrow = narrowOpen.page;
await scrollTo(narrow, 0, 650);
await shot(narrow, "narrow-01-hero");
const narrowReadingTop = await sectionTop(narrow, "#reading-list");
await scrollTo(narrow, narrowReadingTop - 100, 450);
await shot(narrow, "narrow-02-reading");
const narrowDnaTop = await sectionTop(narrow, "#trader-dna");
await scrollTo(narrow, narrowDnaTop - 100, 450);
await shot(narrow, "narrow-03-dna");
report.narrow360 = await state(narrow);
await narrow.close();

const wideOpen = await openPage({ width: 1728, height: 1000, deviceScaleFactor: 1 }, false);
const wide = wideOpen.page;
await scrollTo(wide, 0, 850);
await shot(wide, "wide-01-hero");
const wideHighlightsTop = await sectionTop(wide, "#highlights");
await scrollTo(wide, wideHighlightsTop + 80, 500);
await shot(wide, "wide-02-highlights");
const wideReadingTop = await sectionTop(wide, "#reading-list");
await scrollTo(wide, wideReadingTop + 180, 500);
await shot(wide, "wide-03-reading");
const wideDnaTop = await sectionTop(wide, "#trader-dna");
await scrollTo(wide, wideDnaTop + 220, 500);
await shot(wide, "wide-04-dna");
report.wide1728 = await state(wide);
await wide.close();

const reducedOpen = await openPage({ width: 1440, height: 900, deviceScaleFactor: 1 }, true);
const reduced = reducedOpen.page;
const reducedWorldview = await sectionTop(reduced, "#worldview");
await scrollTo(reduced, reducedWorldview + 240, 250);
await shot(reduced, "reduced-01-worldview");
const reducedDna = await sectionTop(reduced, "#trader-dna");
await scrollTo(reduced, reducedDna + 180, 250);
await shot(reduced, "reduced-02-dna");
report.reduced = await state(reduced);
await reduced.close();

report.status = {
  desktop: desktopOpen.status,
  mobile: mobileOpen.status,
  narrow360: narrowOpen.status,
  wide1728: wideOpen.status,
  reduced: reducedOpen.status,
  readingHash: readingHashOpen.status,
};
report.errors = errors;
report.failures = failures;

fs.writeFileSync(
  path.join(outDir, "diagnostics.json"),
  JSON.stringify(report, null, 2),
);

await browser.close();

const widths = [
  ["desktop", report.desktopFinal],
  ["wide1728", report.wide1728],
  ["mobile", report.mobile],
  ["narrow360", report.narrow360],
];

for (const [name, value] of widths) {
  if (value.scrollWidth !== value.clientWidth) {
    throw new Error(`${name}: horizontal overflow ${value.scrollWidth}/${value.clientWidth}`);
  }
}
if (!report.reading || report.reading.title !== "納瓦爾寶典" || report.reading.category !== "思維成長" || report.reading.activeTab !== 2) {
  throw new Error(`reading interaction failed: ${JSON.stringify(report.reading)}`);
}
if (
  !report.readingHashLanding ||
  report.readingHashLanding.hash !== "#reading-list" ||
  report.readingHashLanding.scrollY < 1000 ||
  report.readingHashLanding.targetTop < -20 ||
  report.readingHashLanding.targetTop > 180 ||
  report.readingHashLanding.title !== "Reading list."
) {
  throw new Error(`reading hash landing failed: ${JSON.stringify(report.readingHashLanding)}`);
}
if (!report.mobile.menuOpen) throw new Error("mobile menu did not open by keyboard");
if (errors.length) throw new Error(`console/page errors: ${JSON.stringify(errors.slice(0, 8))}`);
if (failures.length) throw new Error(`request failures: ${JSON.stringify(failures.slice(0, 8))}`);

console.log(JSON.stringify(report, null, 2));

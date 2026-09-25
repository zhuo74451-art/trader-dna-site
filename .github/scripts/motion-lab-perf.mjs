import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const browserPath = process.env.BROWSER;
if (!browserPath) throw new Error("BROWSER env is required");

const profile = process.env.MOTION_PERF_PROFILE ?? "desktop";
if (!["desktop", "mobile"].includes(profile)) {
  throw new Error(`Unsupported MOTION_PERF_PROFILE: ${profile}`);
}
const isMobile = profile === "mobile";

const outDir = path.resolve("motion-lab-qa");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: browserPath,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const page = await browser.newPage();
await page.setViewport(
  isMobile
    ? {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      }
    : { width: 1440, height: 900, deviceScaleFactor: 1 },
);

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(err.message));

await page.evaluateOnNewDocument(() => {
  window.__motionPerf = { longTasks: [], layoutShifts: [] };
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__motionPerf.longTasks.push({
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    });
    longTaskObserver.observe({ entryTypes: ["longtask"] });
  } catch {}

  try {
    const shiftObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          const sources = Array.from(entry.sources || []).slice(0, 6).map((source) => {
            const node = source.node;
            let label = null;
            if (node instanceof Element) {
              label = node.tagName.toLowerCase();
              if (node.id) label += `#${node.id}`;
              const classes = Array.from(node.classList || []).slice(0, 3);
              if (classes.length) label += "." + classes.join(".");
            }
            return {
              node: label,
              previousRect: source.previousRect
                ? {
                    x: source.previousRect.x,
                    y: source.previousRect.y,
                    width: source.previousRect.width,
                    height: source.previousRect.height,
                  }
                : null,
              currentRect: source.currentRect
                ? {
                    x: source.currentRect.x,
                    y: source.currentRect.y,
                    width: source.currentRect.width,
                    height: source.currentRect.height,
                  }
                : null,
            };
          });
          window.__motionPerf.layoutShifts.push({
            value: entry.value,
            startTime: entry.startTime,
            scrollY: window.scrollY,
            sources,
          });
        }
      }
    });
    shiftObserver.observe({ type: "layout-shift", buffered: true });
  } catch {}
});

const response = await page.goto("http://127.0.0.1:4174/82trade-motion-lab/", {
  waitUntil: "networkidle0",
  timeout: 30000,
});
if (response?.status() !== 200) throw new Error(`Motion Lab status ${response?.status()}`);

await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready;
  const images = Array.from(document.images);
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }),
    ),
  );
});
await new Promise((resolve) => setTimeout(resolve, 500));

const sample = await page.evaluate(async () => {
  window.scrollTo({ top: 0, behavior: "instant" });
  await new Promise((resolve) => setTimeout(resolve, 250));

  const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const targetDuration = isMobile ? 7000 : 8000;
  const frameIntervals = [];
  const samples = [];
  let previous = performance.now();
  const started = previous;

  await new Promise((resolve) => {
    const tick = (now) => {
      const delta = now - previous;
      previous = now;
      if (delta > 0 && delta < 1000) frameIntervals.push(delta);

      const progress = Math.min(1, (now - started) / targetDuration);
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const top = maxScroll * eased;
      window.scrollTo({ top, behavior: "instant" });

      if (!samples.length || now - samples[samples.length - 1].time >= 250) {
        samples.push({ time: now, top: scrollY });
      }

      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  await new Promise((resolve) => setTimeout(resolve, 450));

  const sorted = [...frameIntervals].sort((a, b) => a - b);
  const percentile = (p) => {
    if (!sorted.length) return null;
    const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
    return sorted[index];
  };

  const perf = window.__motionPerf || { longTasks: [], layoutShifts: [] };
  const layoutShifts = perf.layoutShifts || [];
  const cls = layoutShifts.reduce((sum, item) => sum + (item.value || 0), 0);
  const isIntentionalScrollOwnedShift = (shift) => {
    const sources = shift.sources || [];
    if (!sources.length) return false;
    return sources.every((source) => {
      const node = source.node || "";
      return (
        node.includes("section#real-world.takeover") ||
        node.includes("div.takeoverFrame")
      );
    });
  };
  const intentionalScrollOwnedCls = layoutShifts
    .filter(isIntentionalScrollOwnedShift)
    .reduce((sum, item) => sum + (item.value || 0), 0);
  const unexpectedCls = layoutShifts
    .filter((item) => !isIntentionalScrollOwnedShift(item))
    .reduce((sum, item) => sum + (item.value || 0), 0);

  return {
    viewport: { width: innerWidth, height: innerHeight },
    scrollHeight: document.documentElement.scrollHeight,
    maxScroll,
    finalScrollY: scrollY,
    frameCount: frameIntervals.length,
    frameMs: {
      median: percentile(0.5),
      p90: percentile(0.9),
      p95: percentile(0.95),
      p99: percentile(0.99),
      max: sorted.at(-1) ?? null,
    },
    slowFrames: {
      over24ms: frameIntervals.filter((n) => n > 24).length,
      over32ms: frameIntervals.filter((n) => n > 32).length,
      over50ms: frameIntervals.filter((n) => n > 50).length,
      over100ms: frameIntervals.filter((n) => n > 100).length,
    },
    slowFrameRatio50:
      frameIntervals.length
        ? frameIntervals.filter((n) => n > 50).length / frameIntervals.length
        : 1,
    longTasks: perf.longTasks || [],
    longTaskCount: (perf.longTasks || []).length,
    longTaskTotalMs: (perf.longTasks || []).reduce((sum, item) => sum + item.duration, 0),
    maxLongTaskMs: Math.max(0, ...(perf.longTasks || []).map((item) => item.duration)),
    cls,
    intentionalScrollOwnedCls,
    unexpectedCls,
    layoutShiftCount: layoutShifts.length,
    topLayoutShifts: [...layoutShifts]
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 16),
    samples,
  };
});

const metrics = await page.metrics();
const report = {
  timestamp: new Date().toISOString(),
  profile,
  note:
    `GitHub-hosted headless Chromium ${profile} diagnostic. Use for regression/catastrophic-jank detection only, not as a claim of end-user device FPS. Raw CLS is reported; the hard gate uses unexpectedCls and excludes only explicitly named Real World ScrollTrigger pin-state sources.`,
  status: response?.status() ?? null,
  consoleErrors,
  ...sample,
  browserMetrics: {
    JSHeapUsedSize: metrics.JSHeapUsedSize,
    JSHeapTotalSize: metrics.JSHeapTotalSize,
    Nodes: metrics.Nodes,
    LayoutCount: metrics.LayoutCount,
    RecalcStyleCount: metrics.RecalcStyleCount,
    ScriptDuration: metrics.ScriptDuration,
    LayoutDuration: metrics.LayoutDuration,
    RecalcStyleDuration: metrics.RecalcStyleDuration,
  },
};

fs.writeFileSync(
  path.join(outDir, isMobile ? "performance-mobile.json" : "performance.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

await browser.close();

if (consoleErrors.length) {
  throw new Error(`console/page errors: ${JSON.stringify(consoleErrors.slice(0, 8))}`);
}
if (sample.finalScrollY < sample.maxScroll * 0.98) {
  throw new Error(`scroll traversal incomplete: ${sample.finalScrollY}/${sample.maxScroll}`);
}
if ((sample.frameMs.p95 ?? 999) > 80) {
  throw new Error(`catastrophic p95 frame interval: ${sample.frameMs.p95}ms`);
}
if (sample.slowFrameRatio50 > 0.3) {
  throw new Error(`catastrophic >50ms frame ratio: ${sample.slowFrameRatio50}`);
}
if (sample.maxLongTaskMs > 350) {
  throw new Error(`catastrophic long task: ${sample.maxLongTaskMs}ms`);
}
if (sample.unexpectedCls > 0.1) {
  throw new Error(
    `excessive unexpected CLS: ${sample.unexpectedCls} (raw=${sample.cls}, intentionalScrollOwned=${sample.intentionalScrollOwnedCls})`,
  );
}

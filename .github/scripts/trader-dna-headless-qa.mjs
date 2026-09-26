import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.TDNA_BASE_URL || 'http://127.0.0.1:4173/scan01.html';
const out = 'trader-dna-headless-qa';
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

const errors = [];
page.on('pageerror', err => errors.push(String(err)));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

await page.goto(base, { waitUntil: 'networkidle' });

const start = page.locator('#start, button:has-text("開始"), button:has-text("开始")').first();
await start.waitFor({ state: 'visible', timeout: 15000 });
await start.click();

for (let i = 1; i <= 18; i++) {
  const option = page.locator('.option').first();
  await option.waitFor({ state: 'visible', timeout: 15000 });
  await option.click();
  if (i < 18) {
    await page.waitForFunction((n) => {
      const el = document.querySelector('.count,.question-index');
      return el && el.textContent && (el.textContent.includes(String(n + 1).padStart(2,'0')) || el.textContent.includes(String(n + 1)));
    }, i, { timeout: 15000 }).catch(()=>{});
  }
}

await page.locator('.result').waitFor({ state: 'visible', timeout: 20000 });
await page.locator('.v3-share-studio').waitFor({ state: 'visible', timeout: 20000 });

const bodyText = await page.locator('body').innerText();
if (bodyText.includes('繼續完整 54 題') || bodyText.includes('继续完整 54 题')) {
  throw new Error('54-question continuation CTA is still visible');
}

const card = await page.evaluate(() => {
  const canvas = window.CinemaEdition?.poster?.('4:5') || window.TraderDNAShareCard?.render?.('4:5');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const px = ctx.getImageData(Math.floor(canvas.width * .5), 24, 1, 1).data;
  const luminance = .2126 * px[0] + .7152 * px[1] + .0722 * px[2];
  return { width: canvas.width, height: canvas.height, pixel: Array.from(px), luminance, artifact: canvas.dataset.artifact || '' };
});
if (!card) throw new Error('Share card renderer unavailable');
if (card.width !== 1080 || card.height !== 1350) throw new Error('Unexpected 4:5 card dimensions: ' + JSON.stringify(card));
if (card.luminance < 120) throw new Error('Share card is not the restored light editorial Identity Edition: ' + JSON.stringify(card));

await page.locator('.v3-share-studio').scrollIntoViewIfNeeded();
await page.screenshot({ path: out + '/mobile-result.png', fullPage: true });

const share = page.locator('.v3-share-studio');
await share.screenshot({ path: out + '/share-4x5.png' });

const format916 = page.locator('[data-share-format="9:16"]');
if (await format916.count()) {
  await format916.click();
  await page.waitForTimeout(500);
  const c916 = await page.evaluate(() => {
    const canvas = window.CinemaEdition?.poster?.('9:16') || window.TraderDNAShareCard?.render?.('9:16');
    return canvas ? { width: canvas.width, height: canvas.height } : null;
  });
  if (!c916 || c916.width !== 1080 || c916.height !== 1920) throw new Error('Unexpected 9:16 card dimensions');
  await share.screenshot({ path: out + '/share-9x16.png' });
}

await page.setViewportSize({ width: 1440, height: 1100 });
await page.reload({ waitUntil: 'networkidle' });
const saved = await page.evaluate(() => localStorage.getItem('82trade-trader-dna:quick18-v1.2-2026-09-25'));
await page.screenshot({ path: out + '/desktop-reload.png', fullPage: true });

const receipt = {
  result: 'PASS',
  headless: true,
  base,
  shareCard: card,
  browserErrors: errors,
  savedStatePresent: Boolean(saved),
  checkedAt: new Date().toISOString()
};
await fs.writeFile(out + '/receipt.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
await browser.close();

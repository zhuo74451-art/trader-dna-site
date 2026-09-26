import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';

const base = process.env.TDNA_BASE_URL || 'http://127.0.0.1:4173/scan01.html';
const out = 'trader-dna-headless-qa';
await fs.mkdir(out, { recursive: true });

let browser;
let stage = 'boot';
const errors = [];
const receipt = {
  result: 'FAIL',
  headless: true,
  base,
  stage,
  browserErrors: errors,
  checkedAt: new Date().toISOString()
};

try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER || undefined });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();

  page.on('pageerror', err => errors.push('pageerror: ' + String(err)));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text());
  });

  stage = 'landing';
  await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });

  const start = page.locator('#start');
  await start.waitFor({ state: 'visible', timeout: 15000 });
  await start.click();

  stage = 'questions';
  for (let i = 1; i <= 18; i++) {
    const expected = 'Q' + String(i).padStart(2, '0');
    await page.waitForFunction(
      q => document.querySelector('.question-index')?.textContent?.trim() === q,
      expected,
      { timeout: 15000 }
    );

    const option = page.locator('.option').first();
    await option.waitFor({ state: 'visible', timeout: 15000 });
    await option.click({ timeout: 15000 });

    if (i < 18) {
      const next = 'Q' + String(i + 1).padStart(2, '0');
      await page.waitForFunction(
        q => document.querySelector('.question-index')?.textContent?.trim() === q,
        next,
        { timeout: 15000 }
      );
    }
  }

  stage = 'reveal-or-result';
  await page.locator('.reveal, .result').first().waitFor({ state: 'visible', timeout: 15000 });

  stage = 'result';
  await page.locator('.result').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('.v3-share-studio').waitFor({ state: 'visible', timeout: 15000 });

  const bodyText = await page.locator('body').innerText();
  if (bodyText.includes('繼續完整 54 題') || bodyText.includes('继续完整 54 题')) {
    throw new Error('54-question continuation CTA is still visible');
  }

  stage = 'share-4x5';
  await page.waitForFunction(() => Boolean(window.CinemaEdition?.poster || window.TraderDNAShareCard?.render), null, { timeout: 10000 });
  const card = await page.evaluate(() => {
    const canvas = window.CinemaEdition?.poster?.('4:5') || window.TraderDNAShareCard?.render?.('4:5');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const probes = [
      [Math.floor(canvas.width * .5), 24],
      [Math.floor(canvas.width * .5), Math.floor(canvas.height * .5)],
      [100, 100]
    ].map(([x,y]) => {
      const px = ctx.getImageData(x, y, 1, 1).data;
      const luminance = .2126 * px[0] + .7152 * px[1] + .0722 * px[2];
      return { x, y, pixel: Array.from(px), luminance };
    });
    return {
      width: canvas.width,
      height: canvas.height,
      probes,
      meanLuminance: probes.reduce((s,p)=>s+p.luminance,0)/probes.length,
      artifact: canvas.dataset.artifact || ''
    };
  });
  if (!card) throw new Error('Share card renderer unavailable');
  if (card.width !== 1080 || card.height !== 1350) throw new Error('Unexpected 4:5 card dimensions: ' + JSON.stringify(card));
  if (card.meanLuminance < 120) throw new Error('Share card is not the restored light editorial Identity Edition: ' + JSON.stringify(card));
  receipt.shareCard = card;

  const share = page.locator('.v3-share-studio');
  await share.scrollIntoViewIfNeeded();
  await share.screenshot({ path: out + '/share-4x5.png' });
  await page.screenshot({ path: out + '/mobile-result.png', fullPage: true });

  stage = 'share-9x16';
  const format916 = page.locator('[data-share-format="9:16"]');
  if (await format916.count()) {
    await format916.click();
    await page.waitForTimeout(250);
    const c916 = await page.evaluate(() => {
      const canvas = window.CinemaEdition?.poster?.('9:16') || window.TraderDNAShareCard?.render?.('9:16');
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    });
    if (!c916 || c916.width !== 1080 || c916.height !== 1920) {
      throw new Error('Unexpected 9:16 card dimensions: ' + JSON.stringify(c916));
    }
    receipt.shareCard916 = c916;
    await share.screenshot({ path: out + '/share-9x16.png' });
  }

  stage = 'desktop';
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: out + '/desktop-result.png', fullPage: true });

  receipt.localStorageKeys = await page.evaluate(() => Object.keys(localStorage));

  stage = 'motion-lab';
  const lab = await context.newPage();
  const labErrors = [];
  lab.on('pageerror', err => labErrors.push('pageerror: ' + String(err)));
  lab.on('console', msg => {
    if (msg.type() === 'error') labErrors.push('console: ' + msg.text());
  });
  const labUrl = new URL('/share-motion-lab.html', base).href;
  await lab.goto(labUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await lab.locator('#card').waitFor({ state: 'visible', timeout: 10000 });
  await lab.waitForTimeout(6100);
  const labState = await lab.evaluate(() => ({
    status: document.querySelector('#status')?.textContent || '',
    width: document.querySelector('#card')?.width || 0,
    height: document.querySelector('#card')?.height || 0,
    mediaRecorder: Boolean(window.MediaRecorder),
    captureStream: Boolean(document.querySelector('#card')?.captureStream)
  }));
  if (!(labState.status.includes('IDENTITY ISSUED') || labState.status.includes('LIVING POSTER'))) throw new Error('Motion lab did not reach a stable end state: ' + JSON.stringify(labState));
  if (labState.width !== 1080 || labState.height !== 1350) throw new Error('Unexpected motion lab canvas dimensions');
  if (labErrors.length) throw new Error('Motion lab browser errors: ' + JSON.stringify(labErrors));
  await lab.screenshot({ path: out + '/motion-lab-end.png', fullPage: true });

  stage = 'motion-export';
  const downloadPromise = lab.waitForEvent('download', { timeout: 20000 });
  await lab.locator('#export').click();
  const download = await downloadPromise;
  const suggested = download.suggestedFilename();
  const ext = suggested.toLowerCase().endsWith('.mp4') ? 'mp4' : 'webm';
  const videoPath = out + '/motion-card.' + ext;
  await download.saveAs(videoPath);
  const videoStat = await fs.stat(videoPath);
  if (videoStat.size < 10000) throw new Error('Motion export is unexpectedly small: ' + videoStat.size);
  receipt.motionLab = { ...labState, errors: labErrors };
  receipt.motionExport = { filename: suggested, bytes: videoStat.size, ext };

  stage = 'result-share-donor-lab';
  const donorContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference'
  });
  const donor = await donorContext.newPage();
  const donorErrors = [];
  donor.on('pageerror', err => donorErrors.push('pageerror: ' + String(err)));
  donor.on('console', msg => { if (msg.type() === 'error') donorErrors.push('console: ' + msg.text()); });
  const donorUrl = new URL('/result-share-donor-lab.html', base).href;
  await donor.goto(donorUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const donorCard = donor.locator('#hero-card');
  await donorCard.waitFor({ state: 'visible', timeout: 10000 });

  const box = await donorCard.boundingBox();
  if (!box) throw new Error('Donor lab hero card has no box');
  await donor.screenshot({ path: out + '/donor-lab-hero-front.png', fullPage: true });
  await donor.mouse.move(box.x + box.width * .78, box.y + box.height * .28);
  await donor.waitForTimeout(120);
  const tiltState = await donorCard.evaluate(el => ({
    rx: getComputedStyle(el).getPropertyValue('--rx').trim(),
    ry: getComputedStyle(el).getPropertyValue('--ry').trim(),
    sheen: getComputedStyle(el).getPropertyValue('--sheen').trim()
  }));
  if (tiltState.sheen !== '1') throw new Error('Donor tilt/glare did not activate: ' + JSON.stringify(tiltState));

  await donor.locator('#flip-btn').click();
  await donor.waitForTimeout(720);
  if ((await donorCard.getAttribute('data-flipped')) !== '1') throw new Error('Donor flip state did not activate');
  await donor.screenshot({ path: out + '/donor-lab-hero-back.png', fullPage: true });

  await donor.locator('#open-btn').click();
  await donor.waitForTimeout(900);
  const dialogOpen = await donor.locator('#share-dialog').evaluate(el => el.open);
  if (!dialogOpen) throw new Error('Donor morphing dialog did not open');
  const parentInDialog = await donor.locator('.dialog-stage .identity-artifact').count();
  if (!parentInDialog) throw new Error('Shared artifact did not morph into dialog stage');

  await donor.locator('#close-dialog').click();
  await donor.waitForTimeout(900);
  const sharedArtifact = donor.locator('#share-dock .identity-artifact');
  await sharedArtifact.waitFor({ state: 'visible', timeout: 10000 });
  if ((await sharedArtifact.getAttribute('data-flipped')) === '1') throw new Error('Share dock must reset artifact to public front face');

  await donor.locator('[data-format="9:16"]').click();
  if ((await donor.locator('#share-dock').getAttribute('data-format')) !== '9:16') throw new Error('Share format state did not switch to 9:16');

  await donor.locator('#share-scene').scrollIntoViewIfNeeded();
  await donor.screenshot({ path: out + '/donor-lab-share.png', fullPage: true });

  if (donorErrors.length) throw new Error('Donor lab browser errors: ' + JSON.stringify(donorErrors));
  receipt.resultShareDonorLab = { tiltState, dialogOpen, format: '9:16', errors: donorErrors };
  await donorContext.close();

  receipt.result = 'PASS';
  receipt.stage = 'done';
} catch (error) {
  receipt.stage = stage;
  receipt.error = error?.stack || String(error);
} finally {
  receipt.browserErrors = errors;
  receipt.checkedAt = new Date().toISOString();
  await fs.writeFile(out + '/receipt.json', JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
  if (browser) await browser.close();
}

if (receipt.result !== 'PASS') process.exit(1);

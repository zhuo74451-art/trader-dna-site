import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';

const base = process.env.TDNA_BASE_URL || 'http://127.0.0.1:4173/scan01.html';
const out = 'trader-dna-headless-qa';
await fs.mkdir(out, { recursive: true });

let browser;
let stage = 'boot';
const errors = [];
const requestedUrls = [];
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
  page.on('response', response => {
    if (response.status() === 404) errors.push('http404: ' + response.url());
  });
  page.on('request', request => requestedUrls.push(request.url()));

  stage = 'landing';
  await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });

  const start = page.locator('#start');
  await start.waitFor({ state: 'visible', timeout: 15000 });

  const aboutAvailable = await page.evaluate(() => typeof about === 'function');
  if (aboutAvailable) {
    await page.evaluate(() => about());
    const aboutDialog = page.locator('.cinema-dialog');
    await aboutDialog.waitFor({ state: 'visible', timeout: 10000 });
    const aboutText = await aboutDialog.innerText();
    if (/54\s*(題|题|QUESTIONS?)/i.test(aboutText)) throw new Error('ABOUT still exposes legacy 54Q product copy');
    await page.evaluate(() => document.querySelector('.cinema-dialog')?.close());
  }

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
  if (/54\s*(題|题|QUESTIONS?)/i.test(bodyText) || bodyText.includes('繼續完整 54 題') || bodyText.includes('继续完整 54 题')) {
    throw new Error('54-question product copy is still visible');
  }
  const legacyQuestionRequests = requestedUrls.filter(url => /questions-[23]\.json(?:$|\?)/.test(url));
  if (legacyQuestionRequests.length) {
    throw new Error('Active 18Q runtime requested dormant Q19-54 data: ' + JSON.stringify(legacyQuestionRequests));
  }
  receipt.activeQuestionData = {
    question1Requested: requestedUrls.some(url => /questions-1\.json(?:$|\?)/.test(url)),
    dormantQuestionRequests: legacyQuestionRequests
  };

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

  stage = 'root-redirect';
  const rootContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  });
  const rootPage = await rootContext.newPage();
  const rootUrl = new URL('/index.html?qa=root#contract', base).href;
  await rootPage.goto(rootUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await rootPage.waitForURL(url => url.pathname.endsWith('/scan01.html') && url.searchParams.get('qa') === 'root' && url.hash === '#contract', { timeout: 10000 });
  const rootText = await rootPage.locator('body').innerText();
  if (/54\s*(題|题|QUESTIONS?)/i.test(rootText)) throw new Error('Legacy root still exposes 54Q product copy');
  receipt.rootRedirect = { url: rootPage.url(), preservedQueryAndHash: true };
  await rootContext.close();

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

  stage = 'production-result-share-candidate';
  const candidateContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference'
  });
  const candidate = await candidateContext.newPage();
  const candidateErrors = [];
  candidate.on('pageerror', err => candidateErrors.push('pageerror: ' + String(err)));
  candidate.on('console', msg => { if (msg.type() === 'error') candidateErrors.push('console: ' + msg.text()); });
  const candidateUrl = new URL('/cinema-detail-05-candidate.html', base).href;
  await candidate.goto(candidateUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await candidate.locator('#start').click();
  for (let i = 1; i <= 18; i++) {
    const expected = 'Q' + String(i).padStart(2, '0');
    await candidate.waitForFunction(q => document.querySelector('.question-index')?.textContent?.trim() === q, expected, { timeout: 15000 });
    await candidate.locator('.option').first().click({ timeout: 15000 });
  }
  await candidate.locator('.result').waitFor({ state: 'visible', timeout: 20000 });
  const flipControl = candidate.locator('.rs-flip-control');
  await flipControl.waitFor({ state: 'visible', timeout: 15000 });
  await candidate.screenshot({ path: out + '/candidate-result-front.png', fullPage: false });

  await flipControl.click();
  await candidate.waitForTimeout(760);
  const flipState = await flipControl.evaluate(el => ({
    state: el.closest('.result')?.querySelector('.v47-identity-stack')?.getAttribute('data-rs-flipped') || null,
    controlText: el.textContent?.trim() || '',
    clickCount: el.getAttribute('data-rs-click-count') || '0',
    stackCount: document.querySelectorAll('.v47-identity-stack').length
  }));
  if (flipState.state !== '1') throw new Error('Production candidate flip did not reach back face: ' + JSON.stringify(flipState));
  receipt.productionCandidateFlipState = flipState;
  await candidate.screenshot({ path: out + '/candidate-result-back.png', fullPage: false });

  await flipControl.click();
  await candidate.waitForTimeout(760);
  const publishBridge = candidate.locator('.rs-publish-bridge');
  await publishBridge.click();
  await candidate.waitForFunction(() => document.querySelector('.v3-share-studio')?.dataset?.v48Publish === 'published', null, { timeout: 10000 });
  const publishedState = await candidate.locator('.v3-share-studio').getAttribute('data-v48-publish');
  if (publishedState !== 'published') throw new Error('Production candidate did not complete share publication');
  await candidate.locator('.v3-share-studio').screenshot({ path: out + '/candidate-share-published.png' });
  if (candidateErrors.length) throw new Error('Production candidate browser errors: ' + JSON.stringify(candidateErrors));
  receipt.productionResultShareCandidate = { flip: true, publishedState, errors: candidateErrors };
  await candidateContext.close();

  stage = 'experience-candidate';
  const ecContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference'
  });
  const ec = await ecContext.newPage();
  const ecErrors = [];
  ec.on('pageerror', err => ecErrors.push('pageerror: ' + String(err)));
  ec.on('console', msg => { if (msg.type() === 'error') ecErrors.push('console: ' + msg.text()); });
  const ecUrl = new URL('/cinema-detail-06-experience-candidate.html', base).href;
  await ec.goto(ecUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await ec.locator('#start').waitFor({ state: 'visible', timeout: 15000 });

  const heroText = await ec.locator('.hero').innerText();
  for (const token of ['在更大的世界中','16','6','18','≈3']) {
    if (!heroText.includes(token)) throw new Error('EC-01 hero missing token: ' + token);
  }
  const placeholderMedia = await ec.locator('.ec-species-media[data-ready="1"]').count();
  if (placeholderMedia) throw new Error('EC-01 rendered an unapproved Species placeholder');
  await ec.screenshot({ path: out + '/ec01-landing.png', fullPage: false });

  await ec.locator('#start').click();
  for (let i = 1; i <= 18; i++) {
    const expected = 'Q' + String(i).padStart(2, '0');
    await ec.waitForFunction(q => document.querySelector('.question-index')?.textContent?.trim() === q, expected, { timeout: 15000 });
    await ec.locator('.option').first().click({ timeout: 15000 });
  }
  await ec.locator('.result').waitFor({ state: 'visible', timeout: 20000 });
  const ecArchive = ec.locator('.ec-class-archive');
  await ecArchive.waitFor({ state: 'attached', timeout: 10000 });
  if (!(await ecArchive.getAttribute('hidden'))) throw new Error('EC-01 archive must stay hidden until all 16 approved thumbnails exist');

  const ecFlip = ec.locator('.rs-flip-control');
  await ecFlip.waitFor({ state: 'visible', timeout: 10000 });
  await ecFlip.click();
  await ec.waitForTimeout(720);
  const ecFlipState = await ecFlip.evaluate(el => el.closest('.result')?.querySelector('.v47-identity-stack')?.getAttribute('data-rs-flipped'));
  if (ecFlipState !== '1') throw new Error('EC-01 result flip failed');

  await ecFlip.click();
  await ec.waitForTimeout(720);
  await ec.locator('.rs-publish-bridge').click();
  await ec.waitForFunction(() => document.querySelector('.v3-share-studio')?.dataset?.v48Publish === 'published', null, { timeout: 10000 });
  await ec.locator('.v3-share-studio').screenshot({ path: out + '/ec01-share.png' });

  if (ecErrors.length) throw new Error('EC-01 browser errors: ' + JSON.stringify(ecErrors));
  receipt.experienceCandidate = {
    hero: true,
    approvedPlaceholderPolicy: true,
    archiveGated: true,
    resultFlip: true,
    sharePublished: true,
    errors: ecErrors
  };
  await ecContext.close();

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

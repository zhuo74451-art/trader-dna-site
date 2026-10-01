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

  stage = 'corrupt-state-recovery';
  await page.evaluate(() => {
    const key = '82trade-trader-dna:quick18-v1.2-2026-09-25';
    localStorage.setItem(key, JSON.stringify({
      mode: 'quick',
      index: 17,
      answers: { 1: 'A', 3: 'B' },
      completed: true,
      completedRecord: { questionCount: 1, dna: 'SAGC' }
    }));
  });
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('.question-index')?.textContent?.trim() === 'Q02', null, { timeout: 15000 });
  if (await page.locator('.result').count()) throw new Error('Corrupt incomplete state was accepted as a completed result');
  const repairedState = await page.evaluate(() => {
    const value = localStorage.getItem('82trade-trader-dna:quick18-v1.2-2026-09-25');
    return value ? JSON.parse(value) : null;
  });
  if (!repairedState || repairedState.completed || repairedState.index !== 1 || Object.keys(repairedState.answers).join(',') !== '1') {
    throw new Error('Corrupt state was not normalized to its contiguous valid answer prefix: ' + JSON.stringify(repairedState));
  }
  await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('82trade-trader-dna:quick18-')).forEach(key => localStorage.removeItem(key)));
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('#start').waitFor({ state: 'visible', timeout: 15000 });

  await page.locator('#start').click();

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
  await page.waitForFunction(() => Boolean(window.TraderDNAShareCard?.build && document.querySelector('.scan01-authority-native')), null, { timeout: 10000 });
  const card = await page.evaluate(async () => {
    const artifact = await window.TraderDNAShareCard.build();
    if (!artifact?.blob) return null;
    const bitmap = await createImageBitmap(artifact.blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = ctx.getImageData(Math.floor(canvas.width * .48), Math.floor(canvas.height * .3), Math.floor(canvas.width * .5), Math.floor(canvas.height * .62)).data;
    let dark = 0;
    let sum = 0;
    let sumSquares = 0;
    let sampled = 0;
    for (let i = 0; i < pixels.length; i += 64) {
      const luminance = .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
      if (luminance < 125) dark++;
      sum += luminance;
      sumSquares += luminance * luminance;
      sampled++;
    }
    const mean = sum / sampled;
    const standardDeviation = Math.sqrt(Math.max(0, sumSquares / sampled - mean * mean));
    const studio = document.querySelector('.v3-share-studio');
    return {
      width: canvas.width,
      height: canvas.height,
      type: artifact.blob.type,
      size: artifact.blob.size,
      darkRatio: dark / sampled,
      standardDeviation,
      authorityBlobActive: studio?._shareBlob === studio?._authorityBlob
    };
  });
  if (!card) throw new Error('Share card renderer unavailable');
  if (card.width !== 1080 || card.height !== 1350) throw new Error('Unexpected 4:5 card dimensions: ' + JSON.stringify(card));
  if (card.type !== 'image/png' || card.size < 500000) throw new Error('Share card PNG payload is incomplete: ' + JSON.stringify(card));
  if (card.darkRatio < .08 || card.standardDeviation < 35) throw new Error('Share card character artwork is missing or visually blank: ' + JSON.stringify(card));
  if (!card.authorityBlobActive) throw new Error('Legacy renderer overwrote the authority share artifact: ' + JSON.stringify(card));
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

  stage = 'responsive-result-layout';
  const layoutChecks = [];
  for (const width of [2390, 1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 });
    await page.waitForTimeout(80);
    const layout = await page.evaluate(() => {
      const portrait = [...document.querySelectorAll('.portrait p')].map(element => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
      });
      const supportGap = portrait.length >= 3
        ? (Math.abs(portrait[1].y - portrait[2].y) < 1 ? portrait[2].x - portrait[1].right : portrait[2].y - portrait[1].bottom)
        : null;
      const textOverflow = [...document.querySelectorAll('.portrait p,.v3-scene-card p,.v3-person-desc,.reminder p,.dim-top')]
        .filter(element => element.scrollWidth > element.clientWidth + 2)
        .map(element => ({ className: element.className, text: (element.textContent || '').trim().slice(0, 60) }));
      const dimensionOverlap = [...document.querySelectorAll('.dim-top')].map(row => {
        const [label, value] = row.children;
        const labelRect = label.getBoundingClientRect();
        const valueRect = value.getBoundingClientRect();
        return Math.max(0, labelRect.right - valueRect.left);
      });
      const shareRect = document.querySelector('.v3-share-stage')?.getBoundingClientRect();
      const personCopyRect = document.querySelector('.v3-person-copy')?.getBoundingClientRect();
      return {
        width: innerWidth,
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        supportGap,
        textOverflow,
        dimensionOverlap: Math.max(0, ...dimensionOverlap),
        shareWidth: shareRect?.width || 0,
        personCopyWidth: personCopyRect?.width || 0
      };
    });
    if (layout.documentOverflow > 1) throw new Error(`Result layout overflows by ${layout.documentOverflow}px at ${width}px`);
    if (layout.supportGap !== null && layout.supportGap < 0) throw new Error(`Decision portrait paragraphs overlap by ${Math.abs(layout.supportGap)}px at ${width}px`);
    if (width > 899 && layout.supportGap < 24) throw new Error(`Decision portrait column gap is only ${layout.supportGap}px at ${width}px`);
    if (layout.textOverflow.length) throw new Error(`Result text overflow at ${width}px: ${JSON.stringify(layout.textOverflow)}`);
    if (layout.dimensionOverlap > 1) throw new Error(`Dimension labels overlap by ${layout.dimensionOverlap}px at ${width}px`);
    if (!layout.shareWidth || (width <= 390 && layout.shareWidth > width - 24)) throw new Error(`Share card width is invalid at ${width}px: ${layout.shareWidth}px`);
    if (width >= 761 && width <= 899 && layout.personCopyWidth < 260) throw new Error(`Same-type profile copy is too narrow at ${width}px: ${layout.personCopyWidth}px`);
    layoutChecks.push(layout);
  }
  receipt.responsiveResultLayout = layoutChecks;

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
  await ec.evaluate(async () => { try { await document.fonts.ready; } catch {} });

  const heroText = await ec.locator('.hero').innerText();
  for (const token of ['在更大的世界中','16','6','18','≈3']) {
    if (!heroText.includes(token)) throw new Error('EC-01 hero missing token: ' + token);
  }
  const originMedia = ec.locator('.ec-species-media[data-ready="1"] img, .ec-species-media[data-ready="1"] video');
  await originMedia.waitFor({ state: 'visible', timeout: 10000 });
  const originMediaState = await originMedia.evaluate(el => ({
    tag: el.tagName,
    src: el.getAttribute('src') || '',
    loaded: el.tagName === 'IMG' ? (el.complete && el.naturalWidth > 0) : el.readyState >= 2
  }));
  if (!originMediaState.loaded || !originMediaState.src.includes('base-species-front.webp')) {
    throw new Error('EC-01 did not mount the approved base Species media: ' + JSON.stringify(originMediaState));
  }
  await ec.screenshot({ path: out + '/ec01-landing.png', fullPage: false });

  await ec.locator('#start').click();
  for (let i = 1; i <= 18; i++) {
    const expected = 'Q' + String(i).padStart(2, '0');
    await ec.waitForFunction(q => document.querySelector('.question-index')?.textContent?.trim() === q, expected, { timeout: 15000 });
    await ec.locator('.option').first().click({ timeout: 15000 });
  }
  await ec.locator('.result').waitFor({ state: 'visible', timeout: 20000 });
  const classArt = ec.locator('.ec-class-sprite-media[data-ready="1"]');
  await classArt.waitFor({ state: 'visible', timeout: 10000 });
  const classArtState = await classArt.evaluate(el => ({
    spriteIndex: el.dataset.spriteIndex,
    backgroundImage: getComputedStyle(el).backgroundImage,
    quality: document.body.dataset.ecSpriteQuality || ''
  }));
  if (classArtState.spriteIndex !== '1' || classArtState.quality !== 'hq-binary' || !classArtState.backgroundImage.includes('initial-class-sprite-hq.webp')) {
    throw new Error('EC-01 IWGC HQ initial-class art did not mount correctly: ' + JSON.stringify(classArtState));
  }
  await ec.locator('.result-hero').screenshot({ path: out + '/ec01-result-hero.png' });

  const ecArchive = ec.locator('.ec-class-archive');
  await ecArchive.waitFor({ state: 'visible', timeout: 10000 });
  const archiveState = await ecArchive.evaluate(el => ({
    authority: el.dataset.visualAuthority,
    hidden: el.hidden,
    cards: el.querySelectorAll('.ec-class-card').length,
    spriteCards: el.querySelectorAll('.ec-class-card-art[data-ready="1"]').length,
    text: el.innerText
  }));
  if (archiveState.hidden || archiveState.authority !== 'approved-visual-bible-web-crop' || archiveState.cards !== 16 || archiveState.spriteCards !== 16) {
    throw new Error('EC-01 approved initial-class archive did not mount all 16 classes: ' + JSON.stringify(archiveState));
  }
  for (const token of ['哨兵','狙擊手','錦衣衛','指揮官']) {
    if (!archiveState.text.includes(token)) throw new Error('EC-01 archive missing class label: ' + token);
  }
  await ecArchive.scrollIntoViewIfNeeded();
  await ecArchive.screenshot({ path: out + '/ec01-initial-class-archive.png' });

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
  const ecShareState = await ec.locator('.v3-share-studio').evaluate(el => ({
    published: el.dataset.v48Publish,
    classMedia: el.dataset.ecClassShare || null,
    format: el.dataset.format || null
  }));
  if (ecShareState.classMedia !== '1') throw new Error('EC-01 Material 02 did not receive initial-class media: ' + JSON.stringify(ecShareState));
  await ec.locator('.v3-share-studio').screenshot({ path: out + '/ec01-share.png' });

  if (ecErrors.length) throw new Error('EC-01 browser errors: ' + JSON.stringify(ecErrors));
  receipt.experienceCandidate = {
    hero: true,
    approvedOriginSpecies: originMediaState,
    initialClassResult: classArtState,
    initialClassArchive: archiveState,
    resultFlip: true,
    sharePublished: ecShareState,
    errors: ecErrors
  };
  await ecContext.close();

  stage = 'experience-candidate-mobile';
  const ecMobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  });
  const ecMobile = await ecMobileContext.newPage();
  const ecMobileErrors = [];
  ecMobile.on('pageerror', err => ecMobileErrors.push('pageerror: ' + String(err)));
  ecMobile.on('console', msg => { if (msg.type() === 'error') ecMobileErrors.push('console: ' + msg.text()); });
  await ecMobile.goto(ecUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await ecMobile.locator('#start').waitFor({ state: 'visible', timeout: 15000 });
  await ecMobile.evaluate(async () => { try { await document.fonts.ready; } catch {} });
  const mobileMetrics = await ecMobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    heroHeight: Math.round(document.querySelector('.hero')?.getBoundingClientRect().height || 0),
    startWidth: Math.round(document.querySelector('#start')?.getBoundingClientRect().width || 0)
  }));
  if (mobileMetrics.scrollWidth > mobileMetrics.innerWidth + 2) throw new Error('EC-01 mobile has horizontal overflow: ' + JSON.stringify(mobileMetrics));
  await ecMobile.screenshot({ path: out + '/ec01-landing-mobile.png', fullPage: true });

  await ecMobile.locator('#start').click();
  for (let i = 1; i <= 18; i++) {
    const expected = 'Q' + String(i).padStart(2, '0');
    await ecMobile.waitForFunction(q => document.querySelector('.question-index')?.textContent?.trim() === q, expected, { timeout: 15000 });
    await ecMobile.locator('.option').first().click({ timeout: 15000 });
  }
  await ecMobile.locator('.result').waitFor({ state: 'visible', timeout: 20000 });
  const mobileResultMetrics = await ecMobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    resultWidth: Math.round(document.querySelector('.result')?.getBoundingClientRect().width || 0),
    archiveHidden: Boolean(document.querySelector('.ec-class-archive')?.hidden),
    archiveCards: document.querySelectorAll('.ec-class-archive .ec-class-card').length,
    classArtReady: Boolean(document.querySelector('.ec-class-sprite-media[data-ready="1"]')),
    spriteQuality: document.body.dataset.ecSpriteQuality || ''
  }));
  if (mobileResultMetrics.scrollWidth > mobileResultMetrics.innerWidth + 2) throw new Error('EC-01 mobile result has horizontal overflow: ' + JSON.stringify(mobileResultMetrics));
  if (mobileResultMetrics.archiveHidden || mobileResultMetrics.archiveCards !== 16 || !mobileResultMetrics.classArtReady || mobileResultMetrics.spriteQuality !== 'hq-binary') {
    throw new Error('EC-01 mobile initial-class visual failed: ' + JSON.stringify(mobileResultMetrics));
  }
  await ecMobile.screenshot({ path: out + '/ec01-result-mobile.png', fullPage: true });
  if (ecMobileErrors.length) throw new Error('EC-01 mobile browser errors: ' + JSON.stringify(ecMobileErrors));
  receipt.experienceCandidateMobile = { ...mobileMetrics, ...mobileResultMetrics, reducedMotion: true, errors: ecMobileErrors };
  await ecMobileContext.close();

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

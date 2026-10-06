// Real touch test of THE LINE in mobile Chromium: scroll gestures and dragging the line.
// Usage: node mobile.test.js [url]   (needs: npx playwright install chromium)
const { chromium } = require('playwright');
const URL = process.argv[2] || 'https://bour-bon.github.io/the-line/';
let pass = 0, fail = 0;
const check = (n, ok, d) => { ok ? pass++ : fail++; console.log((ok ? '  ok   ' : '  FAIL ') + n + (d !== undefined ? '  [' + JSON.stringify(d) + ']' : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL + '?nocache=' + Date.now(), { waitUntil: 'networkidle' });
  const cdp = await ctx.newCDPSession(page);
  const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
  // a real finger swipe (touch scroll gesture) starting at x,y; positive dy scrolls the page down
  const swipe = async (x, y, dy) => { const n = 10; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 2 }] }); for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - dy * i / n, id: 2 }] }); await sleep(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(400); };
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const box = async sel => page.evaluate(s => { const m = s.match(/^#ladder \.rung:nth-child\((\d+)\)$/); const el = m ? document.querySelectorAll('#ladder .rung')[+m[1]-1] : document.querySelector(s); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top, bottom: r.bottom }; }, sel);

  console.log('Mobile touch test: ' + URL);
  check('only the label blocks scrolling (new version is live)', await page.evaluate(() => ['#ladder', '.dragline'].every(s => getComputedStyle(document.querySelector(s)).touchAction !== 'none') && getComputedStyle(document.querySelector('.dragline .tag')).touchAction === 'none'));

  // bring the ladder into view
  await page.evaluate(() => document.querySelector('#ladder').scrollIntoView({ block: 'start' }));
  await sleep(300);
  const rung = await box('#ladder .rung:nth-child(3)');
  let y0 = await scrollY(); await swipe(195, Math.min(700, Math.max(150, rung.y)), 300);
  check('swiping on the list of uses scrolls the page', (await scrollY()) > y0 + 100, [y0, await scrollY()]);
  y0 = await scrollY(); await swipe(195, 400, -250);
  check('swiping back up scrolls up', (await scrollY()) < y0 - 100, [y0, await scrollY()]);

  // drag the yellow line downwards with a real finger
  await page.evaluate(() => document.querySelector('.dragline').scrollIntoView({ block: 'center' }));
  await sleep(300);
  const before = await page.textContent('#myLineText');
  const l = await box('.dragline .tag');
  await touch('touchStart', l.x, l.y);
  for (let i = 1; i <= 12; i++) { await touch('touchMove', l.x, l.y + i * 18); await sleep(16); }
  await touch('touchEnd');
  await sleep(300);
  const after = await page.textContent('#myLineText');
  check('dragging the label with a finger moves the line', after !== before, [before, after]);
  check('drag state cleared after lifting the finger', !(await page.evaluate(() => document.querySelector('.dragline').classList.contains('dragging'))));

  // the bug report: after touching/dragging the line, can the page still scroll?
  const r2 = await box('#ladder .rung:nth-child(2)');
  y0 = await scrollY(); await swipe(195, Math.min(700, Math.max(150, r2.y)), 300);
  check('after dragging, swiping on the list scrolls the page', (await scrollY()) > y0 + 100, [y0, await scrollY()]);
  // the reported bug: a swipe that starts on the yellow band (beside the label) must scroll, not grab
  await page.evaluate(() => document.querySelector('.dragline').scrollIntoView({ block: 'center' })); await sleep(300);
  const band = await box('.dragline');
  const lineBefore = await page.textContent('#myLineText');
  y0 = await scrollY(); await swipe(30, band.y, 300);
  check('swiping up from the yellow band scrolls the page', (await scrollY()) > y0 + 100, [y0, await scrollY()]);
  await page.evaluate(() => document.querySelector('.dragline').scrollIntoView({ block: 'center' })); await sleep(300);
  const band2 = await box('.dragline');
  y0 = await scrollY(); await swipe(360, band2.y, -300);
  check('swiping down from the yellow band scrolls the page', (await scrollY()) < y0 - 100, [y0, await scrollY()]);
  check('swiping across the band does not move the line', (await page.textContent('#myLineText')) === lineBefore, [lineBefore, await page.textContent('#myLineText')]);
  // tap the line without dragging, then scroll
  const l2 = await box('.dragline .tag');
  await touch('touchStart', l2.x, l2.y); await touch('touchEnd'); await sleep(200);
  y0 = await scrollY(); await swipe(195, 420, 300);
  check('after tapping the line, the page scrolls', (await scrollY()) > y0 + 100, [y0, await scrollY()]);

  // tap a use to move the line, then scroll
  const r5 = await box('#ladder .rung:nth-child(6)');
  await page.touchscreen.tap(195, r5.y); await sleep(200);
  console.log('       finger starts on: ' + await page.evaluate(() => { const e = document.elementFromPoint(195, 420); return e.closest('.tag') ? 'the MY LINE label' : e.closest('.dragline') ? 'the yellow band' : e.tagName; }));
  y0 = await scrollY(); await swipe(30, 420, 300);
  check('after tapping a use, the page scrolls', (await scrollY()) > y0 + 100, [y0, await scrollY()]);

  // whole page reachable: swipe to the bottom
  for (let i = 0; i < 60; i++) await swipe(195, 700, 500);
  check('can swipe all the way to the footer', await page.evaluate(() => { const f = document.querySelector('.site-foot').getBoundingClientRect(); return f.top < innerHeight; }));
  check('no page errors', errors.length === 0, errors);

  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();

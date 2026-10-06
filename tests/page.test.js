// Loads THE LINE in jsdom and exercises every interactive part.
// Usage: node page.test.js [supabase|captcha|none]
//   supabase  full run against the live database (needs Cloudflare's always-pass test secret set in Supabase)
//   captcha   live database with the real Turnstile secret: confirms a failed human check is refused and explained
//   none      no backend configured
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const MODE = process.argv[2] || 'captcha';
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if(!/Could not parse CSS|Could not load link/.test(e.message)) errors.push(e.message); });
vc.on('error', e => errors.push(String(e)));

let src = html;
if(MODE === 'none'){
  // simulate a site with no backend configured
  src = src.replace(/const SUPABASE_URL = '[^']*';/, "const SUPABASE_URL = '';");
}
const dom = new JSDOM(src, {
  url: 'https://bour-bon.github.io/the-line/',
  runScripts: 'dangerously',
  resources: MODE === 'none' ? undefined : 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(w){
    w.matchMedia = q => ({ matches:false, media:q, addEventListener(){}, removeEventListener(){} });
    w.scrollBy = () => {};   // jsdom has no layout or scrolling
    // jsdom has no fetch; lend it Node's real one so supabase-js can reach the database
    Object.assign(w, { fetch, Headers, Request, Response, AbortController });
    // stand-in for Cloudflare Turnstile; Cloudflare's dummy token only passes when Supabase uses the test secret
    w.turnstile = { render(el, o){ setTimeout(() => o.callback(process.env.CAPTCHA_TOKEN || 'XXXX.DUMMY.TOKEN.XXXX'), 10); return 1; }, remove(){} };
  }
});
const w = dom.window, d = w.document, $ = id => d.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function check(name, ok, detail){ if(ok){ pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail!==undefined ? '  -> ' + JSON.stringify(detail) : '')); } }
async function until(fn, ms=15000){ const t = Date.now(); while(Date.now()-t < ms){ try { if(fn()) return true; } catch(e){} await sleep(100); } return false; }
function submitPost(url, stance, title, note){
  $('pUrl').value = url; $('pTitle').value = title||''; $('pNote').value = note||'';
  d.querySelector(`input[name=pStance][value=${stance}]`).checked = true;
  $('postForm').dispatchEvent(new w.Event('submit', { cancelable:true, bubbles:true }));
}

(async () => {
  console.log(`\nTHE LINE — mode: ${MODE}`);
  await sleep(400);

  console.log('Static content');
  check('no script errors on load', errors.length===0, errors);
  check('title is THE LINE', d.title==='THE LINE');
  check('money chart has 4 bars', d.querySelectorAll('#moneyChart .bar').length===4);
  check('energy chart has 2 stacked bars', d.querySelectorAll('#energyChart .stack').length===2);
  check('receipts list has 6 entries', d.querySelectorAll('#receiptList .rc').length===6);
  check('sources table has 20 rows', d.querySelectorAll('.src-table tbody tr').length===20);
  check('ladder has 8 uses', d.querySelectorAll('#ladder .rung').length===8);

  console.log('Live counters');
  const e1 = $('cE').textContent; await sleep(400); const e2 = $('cE').textContent;
  check('electricity counter ticks', e1!==e2 && parseFloat(e2.replace(/,/g,''))>0, [e1,e2]);
  $('modeYear').click();
  check('"so far this year" shows billions of dollars', parseFloat($('cM').textContent.replace(/[$,]/g,''))>1e11, $('cM').textContent);
  check('label switches to the year', /So far in 20\d\d/.test($('meterLabel').textContent), $('meterLabel').textContent);
  $('modeSince').click();

  console.log('Subscription calculator');
  check('typical preset = 253 Wh', $('bE').textContent==='253 Wh', $('bE').textContent);
  d.querySelector('.chip[data-p=video]').click();
  check('video preset = 283.9 kWh', $('bE').textContent==='283.9 kWh', $('bE').textContent);
  check('video verdict names video', /Video is \d+% of your footprint/.test($('bVerdict').textContent), $('bVerdict').textContent);
  $('inT').value='0'; $('inI').value='0'; $('inV').value='0'; $('inT').dispatchEvent(new w.Event('input'));
  check('zero usage handled', $('bE').textContent==='0 Wh' && /cleanest/.test($('bVerdict').textContent), [$('bE').textContent, $('bVerdict').textContent]);

  console.log('Draw your line');
  d.querySelectorAll('#ladder .rung')[5].click();
  check('clicking use 6 moves the line below it', $('myLineText').textContent==='6 of 8 pass', $('myLineText').textContent);
  check('uses below the line are struck through', d.querySelectorAll('#ladder .rung.below').length===2);
  const line = d.querySelector('.dragline');
  line.dispatchEvent(new w.KeyboardEvent('keydown', { key:'ArrowUp', bubbles:true }));
  check('arrow key moves the line', $('myLineText').textContent==='5 of 8 pass', $('myLineText').textContent);
  line.dispatchEvent(new w.KeyboardEvent('keydown', { key:'Home', bubbles:true }));
  check('Home key = nothing passes', $('myLineText').textContent==='Nothing passes');
  d.querySelectorAll('#ladder .rung')[3].click();
  check('line saved locally', w.localStorage.getItem('theline.pos')==='4');

  console.log('Touch and drag (mobile)');
  const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const blocks = css.match(/[^{}]*\{[^{}]*touch-action\s*:\s*none[^{}]*\}/g) || [];
  check('only the yellow line blocks scrolling, so the page scrolls on phones', blocks.length===1 && /^\s*\.dragline\s*\{/.test(blocks[0]), blocks.map(b => b.trim().split('{')[0]));
  const ptr = (type, target, y) => { const e = new w.MouseEvent(type, { bubbles:true, cancelable:true, clientY:y }); Object.defineProperty(e, 'pointerId', { value:7 }); target.dispatchEvent(e); return e; };
  const dl = d.querySelector('.dragline');
  ptr('pointerdown', dl, 0);
  check('pressing the line starts a drag', dl.classList.contains('dragging'));
  // jsdom lays nothing out, so every use sits at y=0: moving below that drags the line to the bottom
  ptr('pointermove', w, 10);
  check('dragging moves the line', $('myLineText').textContent==='Everything passes', $('myLineText').textContent);
  const mv = ptr('pointermove', w, 10);
  check('the drag stops the page scrolling only while dragging', mv.defaultPrevented);
  ptr('pointerup', w, 10);
  check('releasing ends the drag', !dl.classList.contains('dragging'));
  d.querySelectorAll('#ladder .rung')[3].click();
  const after = ptr('pointermove', w, 10);
  check('after release, finger moves no longer move the line or block scrolling', $('myLineText').textContent==='4 of 8 pass' && !after.defaultPrevented, $('myLineText').textContent);

  console.log('Evidence wall: validation');
  submitPost('not a link', 'support');
  check('rejects a non-link', /full web address/.test($('pStatus').textContent), $('pStatus').textContent);
  submitPost('javascript:alert(1)', 'support');
  check('rejects javascript: links', /full web address/.test($('pStatus').textContent), $('pStatus').textContent);

  if(MODE === 'none'){
    console.log('No backend');
    check('tally explains it is unavailable', /isn't available/.test($('worldNote').textContent), $('worldNote').textContent);
    $('saveBtn').click(); await sleep(50);
    check('saving says device-only', /Saved on this device/.test($('saveStatus').textContent), $('saveStatus').textContent);
    submitPost('https://example.org/report', 'support'); await sleep(50);
    check('posting explains the wall is off', /isn't taking posts/.test($('pStatus').textContent), $('pStatus').textContent);
  } else if(MODE === 'captcha'){
    console.log('Human check (live database, real Turnstile secret)');
    check('live tally loads', await until(() => /Be the first|drawn/.test($('worldNote').textContent)), $('worldNote').textContent);
    const before = $('worldNote').textContent;
    $('saveBtn').click();
    check('vote without a valid human check is refused', await until(() => /human check/i.test($('saveStatus').textContent)), $('saveStatus').textContent);
    check('save button is usable again', !$('saveBtn').disabled);
    await sleep(500);
    check('tally unchanged', $('worldNote').textContent===before, [before, $('worldNote').textContent]);
    submitPost('https://www.iea.org/reports/key-questions-on-energy-and-ai', 'support');
    check('post without a valid human check is refused', await until(() => /human check/i.test($('pStatus').textContent)), $('pStatus').textContent);
  } else {
    console.log('Shared tally (' + MODE + ')');
    await until(() => /Be the first|drawn/.test($('worldNote').textContent));
    const before = [...d.querySelectorAll('#hist .c')].reduce((a,c)=>a+ +c.textContent,0);
    $('saveBtn').click();
    check('vote saves', await until(() => /Saved\. Your line counts/.test($('saveStatus').textContent)), $('saveStatus').textContent);
    const after = [...d.querySelectorAll('#hist .c')].reduce((a,c)=>a+ +c.textContent,0);
    check('tally includes the vote', after===before+1 || (MODE==='supabase' && after>=1), [before, after]);
    check('world summary updates', /line(s)? drawn/.test($('worldNote').textContent), $('worldNote').textContent);
    d.querySelectorAll('#ladder .rung')[1].click(); $('saveBtn').click();
    await until(() => /Saved\. Your line counts/.test($('saveStatus').textContent) && !$('saveBtn').disabled);
    const after2 = [...d.querySelectorAll('#hist .c')].reduce((a,c)=>a+ +c.textContent,0);
    check('changing your line replaces your vote, not adds one', after2===after, [after, after2]);

    console.log('Evidence wall (' + MODE + ')');
    const tag = 'test-' + Date.now();
    submitPost('https://www.iea.org/reports/key-questions-on-energy-and-ai?' + tag, 'support', 'IEA test ' + tag, 'Data centres hit 485 TWh');
    check('support link posts', await until(() => /Posted/.test($('pStatus').textContent)), $('pStatus').textContent);
    check('appears in Supports column', await until(() => [...d.querySelectorAll('#feedS a.t')].some(a => a.textContent.includes(tag))));
    check('form clears after posting', $('pUrl').value==='' && $('pTitle').value==='');
    check('summary strip counts it', +$('sumS').textContent>=1, $('sumS').textContent);
    const a = [...d.querySelectorAll('#feedS a.t')].find(a => a.textContent.includes(tag));
    check('posted link opens safely', a && a.rel.includes('noopener') && a.rel.includes('nofollow') && a.target==='_blank');
    if(MODE==='supabase'){
      submitPost('https://example.org/too-fast?' + tag, 'challenge');
      check('rate limit: second post within 30 s is refused', await until(() => /30 seconds/.test($('pStatus').textContent)), $('pStatus').textContent);
      console.log('  … waiting 31 s for the rate limit window');
      await sleep(31000);
    }
    submitPost('https://example.org/challenge?' + tag, 'challenge', '<img src=x onerror=alert(1)> ' + tag);
    check('challenge link posts', await until(() => [...d.querySelectorAll('#feedC a.t')].some(a => a.textContent.includes(tag))), $('pStatus').textContent);
    check('HTML in titles is shown as text, not run', !d.querySelector('#feedC img'));
    const del = [...d.querySelectorAll('#feedS li')].find(li => li.textContent.includes(tag))?.querySelector('.rm');
    check('own post has a Delete button', !!del);
    if(del){ del.click(); check('delete removes it', await until(() => ![...d.querySelectorAll('#feedS a.t')].some(a => a.textContent.includes(tag)))); }
    const del2 = [...d.querySelectorAll('#feedC li')].find(li => li.textContent.includes(tag))?.querySelector('.rm');
    if(del2){ del2.click(); await until(() => ![...d.querySelectorAll('#feedC a.t')].some(a => a.textContent.includes(tag))); }
  }

  check('no script errors during the run', errors.length===0, errors);
  console.log(`\n${pass} passed, ${fail} failed`);
  w.close();
  process.exit(fail ? 1 : 0);
})();

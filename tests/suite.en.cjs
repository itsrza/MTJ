// Batch 6-8 consolidated EN suite (strict-eval harness)
const H = require('./harness.cjs');
const { boot, sleep, setInput, click, pd, byText, nav, ph, dayKey, mkTrade } = H;

let pass = 0, fail = 0;
const fails = [];
function ck(name, cond) {
  if (cond) pass++;
  else { fail++; fails.push(name); }
}
const body = (doc) => doc.body.textContent;

(async () => {
  const today = new Date();
  const isWeekend = [6, 0].includes(today.getDay());
  const tKey = dayKey(today);
  const yKey = dayKey(new Date(Date.now() - 86400000));
  const tradesA = [
    mkTrade({ id: 't-xseedA', entryAt: tKey + 'T08:00:00.000Z', exitAt: tKey + 'T10:00:00.000Z' }),
    mkTrade({ id: 't-xr1', entryAt: yKey + 'T08:00:00.000Z', exitAt: yKey + 'T10:00:00.000Z', entry: 2000, exit: 2100, stop: 1990, amount: 1000 }),
    mkTrade({ id: 't-xr2', entryAt: yKey + 'T12:00:00.000Z', exitAt: yKey + 'T14:00:00.000Z', entry: 2000, exit: 1995, stop: 1990, amount: 500 }),
  ];
  const A = await boot({ lang: 'en', trades: tradesA, extra: { 'pulse.account-capital': '1000' } });
  const w = A.w, doc = w.document;
  ck('boot clean (strict mode)', A.errors.length === 0);
  ck('header rendered', !!doc.querySelector('header'));

  const pulseEl = [...doc.querySelectorAll('section, div')].find((e) => (e.getAttribute('style') || '').includes('mtwarn'));
  ck('weekend pulse on Sat/Sun', isWeekend ? !!pulseEl : !pulseEl);
  ck('reminder gradient removed', !doc.querySelector('[class*="from-accent/10"]'));
  ck('no floating nag chip', !doc.querySelector('div[class*="z-[110]"]'));

  // R:R showcase
  ck('rr widget minimal + below equity', body(doc).includes('R:R Performance') && body(doc).includes('Cumulative R') && !body(doc).includes('R distribution') && body(doc).indexOf('Equity curve') >= 0 && body(doc).indexOf('Equity curve') < body(doc).indexOf('R:R Performance'));

  const bell = doc.querySelector('[aria-label="Notifications"]');
  pd(w, bell); await sleep(500);
  let wrap = doc.querySelector('[data-radix-popper-content-wrapper]');
  ck('weekend: bell has no nag item', isWeekend ? !(wrap && wrap.textContent.includes('Daily note missing')) : true);
  if (wrap) { pd(w, bell); await sleep(300); }

  // ---------------- calculator ----------------
  nav(w, 'Calculator'); await sleep(600);
  ck('calc: margin-first default', !!ph(w, '100'));
  const adv = [...doc.querySelectorAll('button')].find((x) => x.textContent.includes('Advanced settings'));
  if (adv && adv.getAttribute('aria-expanded') !== 'true') click(w, adv);
  await sleep(500);
  setInput(w, ph(w, '1000'), '1000'); await sleep(120);
  setInput(w, ph(w, '100'), '19.96'); await sleep(120);
  setInput(w, ph(w, '108,400'), '2000'); await sleep(120);
  setInput(w, ph(w, '107,900'), '1990'); await sleep(120);
  setInput(w, ph(w, '110,200'), '2100'); await sleep(120);
  setInput(w, ph(w, '10'), '20'); await sleep(600);
  ck('calc: hero margin $19.96', body(doc).includes('$19.96'));
  ck('calc: PV $399.20', body(doc).includes('$399.2'));
  ck('calc: qty 0.1996', body(doc).includes('0.1996'));
  ck('calc: liq $1,908', body(doc).includes('1,908'));
  ck('calc: net TP $19.56', body(doc).includes('19.56'));
  setInput(w, ph(w, '100'), '1000'); await sleep(500);
  ck('calc: dd cap hero $300 + warn', body(doc).includes('$300') && /drawdown/i.test(body(doc)));

  // ---------------- add trade: outcome $ boxes ----------------
  click(w, byText(doc, 'button', 'Add trade') || doc.querySelector('[aria-label="Add trade"]'));
  await sleep(700);
  const dlg = () => doc.querySelector('[role="dialog"]');
  ck('add dialog open', !!dlg());
  ck('add: qty field removed', !dlg().querySelector('input[placeholder="0.001"]'));
  ck('add: P/B/L cards removed', !dlg().textContent.includes('Price moved in'));
  const seg = () => dlg().querySelector('[role="group"]');
  ck('add: boxes dir ltr + order TP,BE,SL', seg().getAttribute('dir') === 'ltr' && [...seg().children].map((c) => c.querySelector('input').placeholder).join(',') === 'TP,BE,SL');
  ck('add: label TP/BE/SL above', dlg().textContent.includes('TP/BE/SL'));
  const box = (id) => [...seg().children].find((c) => c.querySelector('input').placeholder === id);
  const boxIn = (id) => box(id).querySelector('input');
  ck('add: boxes idle', box('TP').getAttribute('aria-pressed') === 'false');
  const badge = () => [...dlg().querySelectorAll('span')].some((sp) => sp.textContent === 'Long' || sp.textContent === 'Short');
  ck('add: badge hidden before prices', !badge());
  const pick = async (d, sym) => {
    click(w, d.querySelector('button[aria-label="Asset"]'));
    await sleep(400);
    click(w, [...doc.querySelectorAll('[role="option"]')].find((o) => o.textContent.includes(sym)));
    await sleep(300);
  };
  await pick(dlg(), 'ETH');
  setInput(w, dlg().querySelector('input[placeholder="108,400"]'), '2000'); await sleep(150);
  setInput(w, dlg().querySelector('input[placeholder="109,860"]'), '1900'); await sleep(150);
  setInput(w, dlg().querySelector('input[placeholder="107,900"]'), '2100'); await sleep(400);
  ck('add: short-TP lights TP box', box('TP').getAttribute('aria-pressed') === 'true');
  ck('add: badge shows Short', badge());
  setInput(w, dlg().querySelector('input[placeholder="107,900"]'), '1990'); await sleep(150);
  setInput(w, dlg().querySelector('input[placeholder="109,860"]'), '2100'); await sleep(300);
  setInput(w, boxIn('TP'), '1000'); await sleep(300);
  const sb = dlg().querySelector('button[type="submit"]');
  ck('add: save enabled with TP $', !!sb && !sb.disabled);
  click(w, sb); await sleep(700);
  let stored = JSON.parse(w.localStorage.getItem('pulse.custom-trades') || '[]');
  const win = stored.filter((t) => t.exitReason === 'TP').pop();
  ck('add: win qty 10 from TP box', !!win && win.quantity === 10);

  // BE with signed amount
  click(w, byText(doc, 'button', 'Add trade')); await sleep(700);
  const d2 = dlg();
  await pick(d2, 'ETH');
  setInput(w, d2.querySelector('input[placeholder="108,400"]'), '2000'); await sleep(150);
  setInput(w, d2.querySelector('input[placeholder="109,860"]'), '2000'); await sleep(150);
  setInput(w, d2.querySelector('input[placeholder="107,900"]'), '1990'); await sleep(300);
  ck('add: BE lights BE box', box('BE').getAttribute('aria-pressed') === 'true');
  setInput(w, boxIn('BE'), '-2'); await sleep(300);
  const sb2 = dlg().querySelector('button[type="submit"]');
  ck('add: BE save enabled with -2', !!sb2 && !sb2.disabled);
  click(w, sb2); await sleep(700);
  stored = JSON.parse(w.localStorage.getItem('pulse.custom-trades') || '[]');
  const be = stored.find((t) => t.exitReason === 'BE');
  ck('add: BE stored bePnl -2', !!be && be.closeType === 'breakeven' && be.bePnl === -2);

  // oversized colloquial warn via TP box
  click(w, byText(doc, 'button', 'Add trade')); await sleep(700);
  const d3 = dlg();
  await pick(d3, 'ETH');
  setInput(w, d3.querySelector('input[placeholder="108,400"]'), '2000'); await sleep(150);
  setInput(w, d3.querySelector('input[placeholder="109,860"]'), '2100'); await sleep(150);
  setInput(w, d3.querySelector('input[placeholder="107,900"]'), '1990'); await sleep(300);
  setInput(w, [...d3.querySelector('[role="group"]').children].find((c) => c.querySelector('input').placeholder === 'TP').querySelector('input'), '5000'); await sleep(500);
  ck('add: oversized colloquial warn', body(doc).includes('ease off'));
  ck('add: no double percent', !body(doc).includes('%%'));
  click(w, d3.querySelector('button[aria-label="Cancel"]')); await sleep(400);

  // ---------------- trades: view dialog + edit/delete ----------------
  nav(w, 'Trades'); await sleep(800);
  ck('trades: no inline edit buttons', ![...doc.querySelectorAll('tbody button')].some((b) => (b.getAttribute('aria-label') || '') === 'Edit trade'));
  click(w, doc.querySelector('tbody tr')); await sleep(700);
  let vd = doc.querySelector('[role="dialog"]');
  ck('view: dialog opens on row click', !!vd && vd.textContent.includes('Quantity') && vd.textContent.includes('Sessions'));
  const vEdit = [...vd.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Edit trade');
  const vDel = [...vd.querySelectorAll('button')].find((x) => x.textContent.includes('Delete trade'));
  ck('view: edit+delete top-right', !!vEdit && !!vDel);
  click(w, vEdit); await sleep(800);
  const ed = doc.querySelector('[role="dialog"]');
  const tpBox = ed && [...ed.querySelector('[role="group"]').children].find((c) => c.querySelector('input').placeholder === 'TP');
  ck('view: edit handoff prefills boxes', !!ed && ed.textContent.includes('Edit trade') && tpBox && [...ed.querySelector('[role="group"]').children].some((c) => c.querySelector('input').value !== ''));
  click(w, ed.querySelector('button[aria-label="Cancel"]')); await sleep(500);
  click(w, doc.querySelector('tbody tr')); await sleep(600);
  vd = doc.querySelector('[role="dialog"]');
  const vDel2 = [...vd.querySelectorAll('button')].find((x) => x.textContent.includes('Delete trade'));
  click(w, vDel2); await sleep(400);
  ck('view: delete asks confirm', [...doc.querySelectorAll('button')].some((x) => x.textContent.includes('Confirm delete?')));
  const confDlg = doc.querySelector('[role="dialog"]');
  const confBtn = [...confDlg.querySelectorAll('button')].find((x) => /confirm/i.test(x.textContent));
  if (confBtn) click(w, confBtn);
  await sleep(700);

  // ---------------- My Plans ----------------
  nav(w, 'My Plans'); await sleep(700);
  ck('plans: page + sample seeded', body(doc).includes('My Plans') && body(doc).includes('Previous Day Candle') && body(doc).includes("Mark the previous day's high and low"));
  click(w, byText(doc, 'button', 'New plan')); await sleep(600);
  const pd2 = doc.querySelector('[role="dialog"]');
  setInput(w, pd2.querySelector('input'), 'ICT Killzone'); await sleep(120);
  setInput(w, pd2.querySelector('textarea'), 'Wait for NY sweep'); await sleep(120);
  setInput(w, pd2.querySelectorAll('input')[1], 'Mark sweep + FVG'); await sleep(120);
  click(w, byText(pd2, 'button', 'Save plan')); await sleep(600);
  ck('plans: card with steps', body(doc).includes('ICT Killzone') && body(doc).includes('Mark sweep + FVG'));
  ck('plans: stored', (w.localStorage.getItem('pulse.my-plans') || '').includes('ICT Killzone'));
  nav(w, 'Settings'); await sleep(700);
  ck('plans: old setups manager gone', !body(doc).includes('Custom setups'));
  // plans combobox inside add-trade advanced
  click(w, byText(doc, 'button', 'Add trade')); await sleep(700);
  const d4 = dlg();
  const advBtn = [...d4.querySelectorAll('button')].find((x) => x.textContent.includes('Advanced (optional)'));
  click(w, advBtn); await sleep(500);
  ck('plans: selectable in add Advanced', d4.textContent.includes('ICT Killzone') || [...d4.querySelectorAll('[role="option"]')].length >= 0 && d4.textContent.includes('My Plans'));

  // ---------------- calendar + notes ----------------
  click(w, d4.querySelector('button[aria-label="Cancel"]')); await sleep(400);
  nav(w, 'Calendar'); await sleep(900);
  const cell = [...doc.querySelectorAll('button[aria-pressed]')].find((b) => b.querySelector('span.bg-accent'));
  click(w, cell); await sleep(700);
  const dd = dlg();
  ck('cal: day dialog', !!dd && dd.textContent.includes('Day details'));
  const cols = dd && dd.querySelector('div[style*="minmax(0,1fr)"]');
  const notesCol = cols && [...cols.children].find((c) => c.querySelector('textarea'));
  ck('cal: notes box', !!notesCol);
  setInput(w, notesCol.querySelector('textarea'), 'lesson one'); await sleep(150);
  click(w, byText(dd, 'button', 'Save Day Note')); await sleep(500);
  ck('cal: note saved', JSON.parse(w.localStorage.getItem('pulse.day-notes') || '{}')[tKey] === 'lesson one');

  // ---------------- analytics has RR ----------------
  nav(w, 'Analytics'); await sleep(800);
  ck('analytics: strip + minimal RR below equity', body(doc).includes('R:R Performance') && body(doc).includes('Net P&L') && body(doc).indexOf('Equity curve') < body(doc).indexOf('R:R Performance'));

  // ---------------- notes page: two columns + composer ----------------
  nav(w, 'Notes'); await sleep(800);
  const subIn = doc.querySelector('input[aria-label="Subject"]');
  const cmpIn = doc.querySelector('textarea[aria-label^="Write a note"]');
  ck('notes: composer present', !!subIn && !!cmpIn);
  setInput(w, subIn, 'My rule'); await sleep(150);
  setInput(w, cmpIn, 'No revenge trades'); await sleep(150);
  click(w, doc.querySelector('button[aria-label="Add note"]')); await sleep(600);
  ck('notes: composer saved', (w.localStorage.getItem('pulse.notes') || '').includes('No revenge trades'));
  const nHtml = doc.body.innerHTML;
  ck('notes: two-column desktop layout', nHtml.includes('lg:col-span-5') && nHtml.includes('lg:col-span-7'));

  // ---------------- bell nag flow (shifted weekday) ----------------
  const fKey = dayKey(new Date(Date.now() - 3 * 86400000));
  const B = await boot({ lang: 'en', shiftDays: -2, trades: [mkTrade({ id: 't-xbell1', entryAt: fKey + 'T08:00:00.000Z', exitAt: fKey + 'T10:00:00.000Z' })] });
  const w2 = B.w, doc2 = w2.document;
  ck('bell boot clean', B.errors.length === 0);
  pd(w2, doc2.querySelector('[aria-label="Notifications"]')); await sleep(500);
  const wrap2 = doc2.querySelector('[data-radix-popper-content-wrapper]');
  const item = wrap2 && [...wrap2.querySelectorAll('button')].find((b) => b.textContent.includes('Daily note missing'));
  ck('bell: weekday nag item', !!item);
  if (item) {
    click(w2, item); await sleep(700);
    const dd2 = doc2.querySelector('[role="dialog"]');
    ck('bell: opens day dialog', !!dd2 && dd2.textContent.includes('Day details'));
    setInput(w2, dd2.querySelector('textarea'), 'bell note'); await sleep(150);
    click(w2, byText(dd2, 'button', 'Save Day Note')); await sleep(500);
    click(w2, dd2.querySelector('button[aria-label="Cancel"]')); await sleep(700);
    pd(w2, doc2.querySelector('[aria-label="Notifications"]')); await sleep(500);
    const wrap3 = doc2.querySelector('[data-radix-popper-content-wrapper]');
    ck('bell: saved day cleared', !(wrap3 && wrap3.textContent.includes('Sep 3')));
  } else {
    ck('bell: opens day dialog', false);
    ck('bell: saved day cleared', false);
  }

  const jsErrors = A.errors.length + B.errors.length;
  process.stdout.write(`${pass} passed, ${fail} failed, ${jsErrors} js errors\n`);
  if (fails.length) process.stdout.write('FAILS:\n- ' + fails.join('\n- ') + '\n');
  process.exit(fail || jsErrors ? 1 : 0);
})().catch((e) => {
  process.stdout.write('SUITE CRASH: ' + e.stack + '\n');
  process.exit(2);
});

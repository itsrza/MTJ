// Batch 6-8 FA/RTL suite (strict-eval harness)
const H = require('./harness.cjs');
const { boot, sleep, setInput, click, byText, nav, ph, dayKey, mkTrade } = H;

let pass = 0, fail = 0;
const fails = [];
function ck(name, cond) {
  if (cond) pass++;
  else { fail++; fails.push(name); }
}

(async () => {
  const today = new Date();
  const tKey = dayKey(today);
  const trades = [mkTrade({ id: 't-xseedT', entryAt: tKey + 'T08:00:00.000Z', exitAt: tKey + 'T10:00:00.000Z' })];
  const { w, errors } = await boot({ lang: 'fa', trades, extra: { 'pulse.account-capital': '1000' } });
  const doc = w.document;
  ck('fa: boot clean (strict)', errors.length === 0);
  ck('fa: rtl', doc.documentElement.getAttribute('dir') === 'rtl');
  ck('fa: header rendered', !!doc.querySelector('header'));

  const isWeekend = [6, 0].includes(today.getDay());
  if (isWeekend) {
    const pulseEl = [...doc.querySelectorAll('section, div')].find((e) => (e.getAttribute('style') || '').includes('mtwarn'));
    ck('fa: weekend pulse', !!pulseEl);
    ck('fa: no floating chip', !doc.querySelector('div[class*="z-[110]"]'));
    const bell = doc.querySelector('[aria-label="اعلان‌ها"]');
    const E = w.PointerEvent || w.MouseEvent;
    bell.dispatchEvent(new E('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
    await sleep(500);
    const wrap = doc.querySelector('[data-radix-popper-content-wrapper]');
    ck('fa: bell no weekend nag', !(wrap && wrap.textContent.includes('یادداشت روز جا مانده')));
    bell.dispatchEvent(new E('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
    await sleep(300);
  }
  ck('fa: reminder gradient removed', !doc.querySelector('[class*="from-accent/10"]'));
  ck('fa: rr widget', doc.body.textContent.includes('عملکرد R:R') && doc.body.textContent.includes('ضریب سود'));

  // calculator fa
  nav(w, 'ماشین‌حساب'); await sleep(500);
  ck('fa: margin mode default', !!ph(w, '100'));
  const adv = [...doc.querySelectorAll('button')].find((x) => x.textContent.includes('تنظیمات پیشرفته'));
  if (adv && adv.getAttribute('aria-expanded') !== 'true') click(w, adv);
  await sleep(500);
  setInput(w, ph(w, '1000'), '1000'); await sleep(120);
  setInput(w, ph(w, '100'), '19.96'); await sleep(120);
  setInput(w, ph(w, '108,400'), '2000'); await sleep(120);
  setInput(w, ph(w, '107,900'), '1990'); await sleep(120);
  setInput(w, ph(w, '110,200'), '2100'); await sleep(120);
  setInput(w, ph(w, '10'), '20'); await sleep(500);
  ck('fa: hero ۱۹', doc.body.textContent.includes('۱۹'));
  ck('fa: pv ۳۹۹', doc.body.textContent.includes('۳۹۹'));
  setInput(w, ph(w, '100'), '1000'); await sleep(500);
  ck('fa: dd cap warning', doc.body.textContent.includes('سقف drawdown'));

  // add trade fa: boxes
  click(w, doc.querySelector('[aria-label="ثبت معامله"]'));
  await sleep(700);
  const dlg = () => doc.querySelector('[role="dialog"]');
  ck('fa: dialog open', !!dlg());
  const seg = () => dlg().querySelector('[role="group"]');
  ck('fa: boxes ltr order TP,BE,SL', seg().getAttribute('dir') === 'ltr' && [...seg().children].map((c) => c.textContent.slice(0, 2)).join(',') === 'TP,BE,SL');
  ck('fa: cards removed', !dlg().textContent.includes('قیمت برابر ورود'));
  const box = (id) => [...seg().children].find((c) => c.textContent.startsWith(id));
  ck('fa: badge hidden before prices', ![...dlg().querySelectorAll('span')].some((sp) => sp.textContent === 'لانگ' || sp.textContent === 'شورت'));
  click(w, dlg().querySelector('button[aria-label="ارز / دارایی"]'));
  await sleep(400);
  click(w, [...doc.querySelectorAll('[role="option"]')].find((o) => o.textContent.includes('ETH')));
  await sleep(300);
  setInput(w, dlg().querySelector('input[placeholder="108,400"]'), '2000'); await sleep(150);
  setInput(w, dlg().querySelector('input[placeholder="109,860"]'), '2000'); await sleep(150);
  setInput(w, dlg().querySelector('input[placeholder="107,900"]'), '1990'); await sleep(300);
  ck('fa: BE box lit', box('BE').getAttribute('aria-pressed') === 'true');
  setInput(w, box('BE').querySelector('input'), '-2'); await sleep(300);
  click(w, dlg().querySelector('button[type="submit"]'));
  await sleep(700);
  const stored = JSON.parse(w.localStorage.getItem('pulse.custom-trades') || '[]');
  ck('fa: BE stored bePnl -2', stored.some((t) => t.exitReason === 'BE' && t.bePnl === -2));

  click(w, doc.querySelector('[aria-label="ثبت معامله"]'));
  await sleep(700);
  const d5 = dlg();
  click(w, d5.querySelector('button[aria-label="ارز / دارایی"]'));
  await sleep(400);
  click(w, [...doc.querySelectorAll('[role="option"]')].find((o) => o.textContent.includes('ETH')));
  await sleep(300);
  setInput(w, d5.querySelector('input[placeholder="108,400"]'), '2000'); await sleep(150);
  setInput(w, d5.querySelector('input[placeholder="109,860"]'), '2100'); await sleep(150);
  setInput(w, d5.querySelector('input[placeholder="107,900"]'), '1990'); await sleep(300);
  const tpBox5 = [...d5.querySelector('[role="group"]').children].find((c) => c.textContent.startsWith('TP'));
  setInput(w, tpBox5.querySelector('input'), '5000'); await sleep(500);
  ck('fa: no double percent', !doc.body.textContent.includes('٪٪'));
  ck('fa: colloquial warn', doc.body.textContent.includes('حجم رو بیار پایین'));
  ck('fa: TP box lit for win', tpBox5.getAttribute('aria-pressed') === 'true');
  click(w, d5.querySelector('button[aria-label="انصراف"]'));
  await sleep(400);

  // trades view fa
  nav(w, 'معاملات'); await sleep(800);
  click(w, doc.querySelector('tbody tr')); await sleep(700);
  const vd = doc.querySelector('[role="dialog"]');
  ck('fa: view dialog', !!vd && vd.textContent.includes('حجم') && vd.textContent.includes('سشن‌ها'));
  ck('fa: view edit/delete fa', [...vd.querySelectorAll('button')].some((b) => b.textContent.includes('ویرایش معامله')) && [...vd.querySelectorAll('button')].some((b) => b.textContent.includes('حذف معامله')));
  click(w, vd.querySelector('button[aria-label="انصراف"]')); await sleep(400);

  // plans fa
  nav(w, 'پلن‌های من'); await sleep(700);
  ck('fa: plans page', doc.body.textContent.includes('پلن‌های من') && doc.body.textContent.includes('هنوز پلنی نداری'));
  click(w, byText(doc, 'button', 'پلن جدید')); await sleep(600);
  const pf = doc.querySelector('[role="dialog"]');
  setInput(w, pf.querySelector('input'), 'ستاپ من'); await sleep(120);
  click(w, byText(pf, 'button', 'ذخیره پلن')); await sleep(600);
  ck('fa: plan card', doc.body.textContent.includes('ستاپ من'));

  // calendar fa
  nav(w, 'تقویم'); await sleep(800);
  ck('fa: hijri title', doc.body.textContent.includes('۱۴۰۵'));
  const cell = [...doc.querySelectorAll('button[aria-pressed]')].find((b) => b.querySelector('span.bg-accent'));
  click(w, cell); await sleep(700);
  const dd = dlg();
  ck('fa: day dialog', !!dd && dd.textContent.includes('جزئیات روز'));
  const cols = dd && dd.querySelector('div[style*="minmax(0,1fr)"]');
  ck('fa: trades col first rtl', !!cols && cols.children[0].textContent.includes('معاملات این روز'));
  setInput(w, cols.children[1].querySelector('textarea'), 'درس امروز'); await sleep(150);
  click(w, byText(dd, 'button', 'ذخیره یادداشت روز')); await sleep(400);
  ck('fa: note saved', JSON.parse(w.localStorage.getItem('pulse.day-notes') || '{}')[tKey] === 'درس امروز');

  nav(w, 'یادداشت‌ها'); await sleep(700);
  ck('fa: notes card', doc.body.textContent.includes('درس‌های روزانه') && doc.body.textContent.includes('درس امروز'));

  const jsErrors = errors.length;
  process.stdout.write(`${pass} passed, ${fail} failed, ${jsErrors} js errors\n`);
  if (fails.length) process.stdout.write('FAILS:\n- ' + fails.join('\n- ') + '\n');
  process.exit(fail || jsErrors ? 1 : 0);
})().catch((e) => {
  process.stdout.write('SUITE CRASH: ' + e.stack + '\n');
  process.exit(2);
});

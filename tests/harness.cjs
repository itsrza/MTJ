// jsdom harness for M4X journal — evaluates the shipped bundle in STRICT mode
const fs = require('fs');
const { JSDOM } = require('jsdom');

const HTML = process.env.MTJ_HTML || '/home/user/MTJ/M4X-Trading-Journal.html';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function bundleSource() {
  if (process.env.MTJ_BUNDLE) {
    return fs
      .readFileSync(process.env.MTJ_BUNDLE, 'utf8')
      .replace(/import\.meta\.url/g, '"http://localhost/app.js"');
  }
  const html = fs.readFileSync(HTML, 'utf8');
  const a = html.indexOf('<script type="module" crossorigin>');
  const b = html.indexOf('</script>', a);
  let js = html.slice(a + '<script type="module" crossorigin>'.length, b);
  js = js.replace(/import\.meta\.url/g, '"http://localhost/app.js"');
  return js;
}

async function boot({ lang = 'en', trades = null, notes = null, shiftDays = 0, extra = {} } = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  const w = dom.window;
  w.matchMedia = w.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  class RO { observe() {} unobserve() {} disconnect() {} }
  w.ResizeObserver = w.ResizeObserver || RO;
  w.IntersectionObserver = w.IntersectionObserver || class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
  w.scrollTo = () => {};
  w.Element.prototype.scrollTo = w.Element.prototype.scrollTo || function () {};
  w.Element.prototype.scrollIntoView = w.Element.prototype.scrollIntoView || function () {};
  if (!w.PointerEvent) w.PointerEvent = w.MouseEvent;
  if (shiftDays) {
    const RD = w.Date;
    const off = shiftDays * 86400000;
    class D extends RD {
      constructor(...a) { if (a.length === 0) super(RD.now() + off); else super(...a); }
      static now() { return RD.now() + off; }
    }
    w.Date = D;
  }
  if (lang) w.localStorage.setItem('pulse.lang', lang);
  w.localStorage.setItem('pulse.sample-mode', trades ? 'custom' : 'demo');
  if (trades) w.localStorage.setItem('pulse.custom-trades', JSON.stringify(trades));
  if (notes) w.localStorage.setItem('pulse.day-notes', JSON.stringify(notes));
  for (const [k, v] of Object.entries(extra)) w.localStorage.setItem(k, v);
  const errors = [];
  w.addEventListener('error', (e) => errors.push(String(e.message)));
  const js = bundleSource();
  try { w.eval('"use strict";' + js); } catch (e) { errors.push('EVAL: ' + e.message); }
  await sleep(2600);
  return { w, errors, dom };
}

function click(w, el) {
  if (!el) return false;
  el.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
  el.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
  el.dispatchEvent(new w.MouseEvent('pointerup', { bubbles: true, cancelable: true, button: 0 }));
  el.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }));
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  return true;
}

function pd(w, el) {
  el.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }));
}

function allByText(root, tag, text) {
  const d = root.documentElement || root;
  return [...d.querySelectorAll(tag || '*')].filter((e) => e.textContent.trim() === text);
}
function byText(root, tag, text) {
  const d = root.documentElement || root;
  if (d.tagName && d.textContent.trim() === text) return d;
  const list = [...d.querySelectorAll(tag || '*')];
  return list.find((e) => e.textContent.trim() === text) || null;
}
function nav(w, label) {
  const doc = w.document;
  const el = [...doc.querySelectorAll('nav button, nav a, aside button, [role="navigation"] button')].find((b) => b.textContent.trim().includes(label)) || byText(doc, 'button', label);
  return click(w, el);
}
function ph(w, p) { return w.document.querySelector(`input[placeholder="${p}"]`); }
function setInput(w, el, v) {
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
  const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
  set.call(el, v);
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
  el.dispatchEvent(new w.Event('change', { bubbles: true }));
  return true;
}
function dayKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function mkTrade(o = {}) {
  const entry = o.entry ?? 2000, exit = o.exit ?? 2100, stop = o.stop ?? 1990;
  const amount = o.amount ?? 1000;
  const qty = o.qty ?? (exit !== entry ? Math.abs(amount) / Math.abs(exit - entry) : 0);
  return {
    id: o.id || 't-xdef1',
    symbol: o.symbol || 'ETHUSDT',
    direction: o.direction ?? (stop < entry ? 'long' : 'short'),
    setup: o.setup || 'Trend',
    entryPrice: entry,
    exitPrice: exit,
    quantity: qty,
    stopLoss: stop,
    fees: 0,
    entryAt: o.entryAt || '2026-09-01T08:00:00.000Z',
    exitAt: o.exitAt || '2026-09-01T10:00:00.000Z',
    sessions: o.sessions || ['London'],
    mistakes: o.mistakes || [],
    ...(o.bePnl !== undefined ? { bePnl: o.bePnl } : {}),
  };
}

module.exports = { boot, sleep, click, pd, byText, allByText, nav, ph, setInput, dayKey, mkTrade, bundleSource };

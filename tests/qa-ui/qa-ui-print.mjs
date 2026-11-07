// For each report route: generate, click Print, capture the print iframe/window HTML (window.print is stubbed so nothing prints).
import { start, go, sleep, text } from './lib.mjs';
const routes = (process.env.QA_ROUTES || '').split(',').filter(Boolean);
const { browser, page } = await start();
await page.evaluate(() => { window.__msgs = []; window.__h = {}; window.__printed = []; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push(o.message); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; window.print = () => window.__printed.push('window.print'); const op = window.open; window.open = (...a) => { window.__printed.push('window.open'); return null; }; });
for (const r of routes) {
  await go(page, '#' + r); await sleep(2500);
  const gen = page.locator('button:not([disabled])').filter({ hasText: /\b(load|generate|show|view|run|search|display|preview)\b/i }).filter({ hasNotText: /print|csv|excel|pdf|export|exit|reset|clear/i });
  if (await gen.count()) { await gen.first().click({ timeout: 4000 }).catch(() => {}); await sleep(7000); }
  const pr = page.locator('button').filter({ hasText: /print/i }).first();
  const hasPrint = await pr.count();
  await page.evaluate(() => { window.__printed = []; });
  let info = 'no print button';
  if (hasPrint) {
    await pr.click({ timeout: 4000 }).catch((e) => console.log('click fail', e.message.slice(0, 60))); await sleep(2500);
    info = await page.evaluate(() => {
      const fr = [...document.querySelectorAll('iframe')].map((f) => { try { const d = f.contentDocument; return { len: (d.body.innerText || '').length, mono: /monospace|courier|consolas/i.test(d.documentElement.innerHTML.slice(0, 6000)), pre: !!d.querySelector('pre'), head: (d.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160) }; } catch { return 'xorigin'; } });
      return { printed: window.__printed, iframes: fr };
    });
  }
  console.log(r, JSON.stringify(info));
}
await browser.close();

// RD Member Setup then RD Repayment for a synthetic QA member (electronAPI stubbed). QA_DO=1 to submit.
import { start, go, sleep, text } from './lib.mjs';
const MB = process.env.QA_MB || '9999962666';
const { browser, page } = await start();
const w = [];
page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) w.push('REQ ' + r.method() + ' ' + r.url().replace(/https?:\/\/[^/]+/, '') + ' ' + (r.postData() || '').slice(0, 400)); });
page.on('response', async (r) => { if (r.request().method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) { let b = ''; try { b = (await r.text()).slice(0, 500); } catch {} w.push('RES ' + r.status() + ' ' + b); } });
await page.evaluate(() => { window.__msgs = []; window.__h = {}; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push({ t: o.type, m: o.message, d: (o.detail || '').slice(0, 300) }); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
const ctl = () => page.evaluate(() => [...document.querySelectorAll('input,button,textarea,[role=combobox]')].map(e => (e.placeholder || e.innerText || e.getAttribute('aria-label') || e.id || e.type || '').trim().slice(0, 24) + (e.disabled ? '[d]' : '') + (e.tagName === 'INPUT' && e.value ? '={' + e.value.slice(0, 10) + '}' : '')));
for (const route of ['#/masters/rd-member-setup', '#/masters/rd-repayment']) {
  await go(page, route); await sleep(1500);
  const f = page.getByPlaceholder('Member No.'); await f.fill(MB); await f.press('Enter'); await sleep(1500);
  const s = page.getByRole('button', { name: /^Search$/ }); if (await s.isEnabled().catch(() => false)) await s.click(); await sleep(3500);
  console.log('\n==', route); console.log((await text(page)).replace(/\s+/g, ' ').slice(0, 800)); console.log('CTRL', JSON.stringify(await ctl()));
}
console.log('MSGS', JSON.stringify(await page.evaluate(() => window.__msgs)));
console.log('WRITES', JSON.stringify(w));
await browser.close();

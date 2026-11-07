// Opens a SB account for a synthetic QA member via Saving Account Opening (electronAPI stubbed).
import { start, go, sleep, text } from './lib.mjs';
const MB = process.env.QA_MB || '9999962666';
const { browser, page } = await start();
const w = [];
page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) w.push('REQ ' + r.method() + ' ' + r.url().replace(/https?:\/\/[^/]+/, '') + ' ' + (r.postData() || '').slice(0, 500)); });
page.on('response', async (r) => { if (r.request().method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) { let b = ''; try { b = (await r.text()).slice(0, 400); } catch {} w.push('RES ' + r.status() + ' ' + b); } });
await page.evaluate(() => { window.__msgs = []; window.__h = {}; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push({ t: o.type, m: o.message, d: (o.detail || '').slice(0, 300) }); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/masters/saving-account-opening'); await sleep(2000);
const f = page.getByPlaceholder('Member no...'); await f.fill(MB); await f.press('Enter'); await sleep(3000);
console.log('AFTER MEMBER', JSON.stringify(await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('input')].map((e, i) => [e.placeholder || e.id || i, e.value]).filter(x => x[1])))));
await page.getByPlaceholder('0.00').first().fill('100');
await page.getByRole('button', { name: /^Save$/ }).click(); await sleep(4500);
console.log('MSGS', JSON.stringify(await page.evaluate(() => window.__msgs)));
console.log('WRITES', JSON.stringify(w));
await browser.close();

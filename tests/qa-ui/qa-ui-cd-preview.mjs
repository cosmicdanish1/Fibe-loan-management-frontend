// Compulsory Deposit: Distribute only (no Post).
import { start, go, sleep, text } from './lib.mjs';
const { browser, page } = await start();
const w = [];
page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) w.push('REQ ' + r.method() + ' ' + r.url().replace(/https?:\/\/[^/]+/, '')); });
await page.evaluate(() => { window.__msgs = []; window.__h = {}; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push({ m: o.message, d: (o.detail || '').slice(0, 300) }); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/transaction/compulsory-deposit'); await sleep(3500);
await page.getByRole('button', { name: /^Distribute$/ }).click(); await sleep(1500);
console.log('DISTRIBUTE no amount:', JSON.stringify(await page.evaluate(() => window.__msgs)));
await page.getByRole('button', { name: /^Post$/ }).click(); await sleep(1500);
console.log('POST no amount:', JSON.stringify(await page.evaluate(() => window.__msgs)), JSON.stringify(w));
const amt = page.getByPlaceholder('0.00').first(); await amt.fill('100');
await page.getByRole('button', { name: /^Distribute$/ }).click(); await sleep(2500);
console.log((await text(page)).replace(/\s+/g, ' ').match(/Distributed.{0,80}/)?.[0]);
const vals = await page.evaluate(() => [...document.querySelectorAll('tbody input')].map(i => i.value));
console.log('rows', vals.length, 'distinct', [...new Set(vals)].slice(0, 5), 'nonzero', vals.filter(v => Number(v) > 0).length);
console.log('MSGS', JSON.stringify(await page.evaluate(() => window.__msgs)));
await browser.close();

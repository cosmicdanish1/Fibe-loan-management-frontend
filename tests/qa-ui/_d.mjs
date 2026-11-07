import { start, go, sleep, text } from './lib.mjs';
const CASE = process.env.QA_CASE;
const { browser, page } = await start();
const w = [];
page.on('response', async (r) => { if (r.request().method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) { let b = ''; try { b = (await r.text()).slice(0, 900); } catch {} w.push(`${r.request().method()} ${r.url().replace(/https?:\/\/[^/]+/, '')} ${r.status()} ${b}`); } });
page.on('request', (r) => { if (r.url().includes('loan-voucher') && r.method() === 'POST') console.log('REQBODY', r.postData()); });
await page.evaluate(() => { window.__msgs = []; window.__h = {}; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push({ t: o.type, m: o.message, d: (o.detail || '').slice(0, 600) }); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/transaction/loan-payment'); await sleep(2000);
await page.locator('#lp-type').click({ force: true }); await sleep(400);
await page.locator('.ant-select-item-option', { hasText: /regular/i }).first().click(); await sleep(1500);
await page.locator('#lp-case').click({ force: true }); await page.keyboard.type(CASE); await sleep(1500);
await page.locator('.ant-select-item-option', { hasText: CASE }).first().click(); await sleep(3500);
console.log('ROW BUTTONS', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('tbody tr')].map(r => [...r.querySelectorAll('button,input')].map(e => (e.getAttribute('aria-label') || e.title || e.innerText || e.type || '').slice(0, 20))))));
// remove the receipt (deduction) rows
for (let i = 0; i < 5; i++) { const del = page.locator('tbody tr', { hasText: /Receipt/ }).first().locator('button').first(); if (!(await del.count())) break; await del.click().catch(() => {}); await sleep(500); }
console.log('AFTER REMOVE', (await text(page)).replace(/\s+/g, ' ').match(/Actual Amount.{0,60}|Total Receipt.{0,60}/g));
await page.getByRole('button', { name: /^Save$/ }).click(); await sleep(6000);
console.log('MSGS', JSON.stringify(await page.evaluate(() => window.__msgs))); console.log('WRITES', JSON.stringify(w));
await browser.close();

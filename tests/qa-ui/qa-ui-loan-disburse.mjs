// Saves the disbursement voucher for a sanctioned synthetic case (QA_CASE) via Loan Payment. Does NOT pass it.
import { start, go, sleep, text } from './lib.mjs';
const CASE = process.env.QA_CASE;
const { browser, page } = await start();
const w = []; page.on('request', (r) => { if (r.url().includes('loan-voucher') && r.method()==='POST') console.log('REQBODY', r.postData()); });
page.on('response', async (r) => { if (r.request().method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) { let b = ''; try { b = (await r.text()).slice(0, 700); } catch {} w.push(`${r.request().method()} ${r.url().replace(/https?:\/\/[^/]+/, '')} ${r.status()} ${b}`); } });
await page.evaluate(() => { window.__msgs = []; window.__h = {}; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push({ t: o.type, m: o.message, d: (o.detail || '').slice(0, 500) }); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/transaction/loan-payment'); await sleep(2000);
await page.locator('#lp-type').click({ force: true }); await sleep(400);
await page.locator('.ant-select-item-option', { hasText: /regular/i }).first().click(); await sleep(1500);
await page.locator('#lp-case').click({ force: true }); await page.keyboard.type(CASE); await sleep(1500);
await page.locator('.ant-select-item-option', { hasText: CASE }).first().click(); await sleep(3500);
console.log('BEFORE', (await text(page)).replace(/\s+/g, ' ').slice(0, 700));
await page.getByRole('button', { name: /^Save$/ }).click(); await sleep(5000);
console.log('MSGS', JSON.stringify(await page.evaluate(() => window.__msgs)));
console.log('WRITES', JSON.stringify(w));
console.log('AFTER', (await text(page)).replace(/\s+/g, ' ').slice(0, 300));
await browser.close();

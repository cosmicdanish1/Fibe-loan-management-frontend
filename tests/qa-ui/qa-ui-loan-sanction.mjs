// Sanctions one synthetic case through the Loan Sanction screen, changing rate/penalty first. QA_CASE required.
import { start, go, sleep } from './lib.mjs';
const CASE = process.env.QA_CASE, RATE = process.env.QA_RATE || '9', PEN = process.env.QA_PEN || '3';
const { browser, page } = await start();
const w = [];
page.on('request', (r) => { if (r.method() === 'PATCH' && r.url().includes('/loans/sanction/')) w.push('REQ ' + r.postData()); });
page.on('response', async (r) => { if (r.request().method() === 'PATCH' && r.url().includes('/loans/sanction/')) w.push('RES ' + r.status()); });
await page.evaluate(() => { window.__h = {}; window.electronAPI = { showMessageBox: async () => ({ response: 0 }), openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/loan-sanction'); await sleep(2500);
await page.locator('#ls-case').click({ force: true }); await page.keyboard.type(CASE); await sleep(1200);
await page.locator('.ant-select-item-option', { hasText: CASE }).first().click(); await sleep(3000);
await page.locator('#ls-rate').fill(RATE); await page.locator('#ls-pen').fill(PEN); await sleep(1500);
console.log('FORM', JSON.stringify(await page.evaluate(() => Object.fromEntries(['ls-amt','ls-inst','ls-rate','ls-pen','ls-emi','ls-int'].map(i => [i, document.getElementById(i)?.value])))));
await page.getByRole('button', { name: /^Sanction$/ }).click(); await sleep(4500);
console.log(JSON.stringify(w));
await browser.close();

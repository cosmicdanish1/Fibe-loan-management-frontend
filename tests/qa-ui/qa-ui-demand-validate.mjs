import { start, go, sleep, text } from './lib.mjs';
const { browser, page } = await start();
const w = [];
page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) w.push('REQ ' + r.method() + ' ' + r.url().replace(/https?:\/\/[^/]+/, '')); });
await page.evaluate(() => { window.__msgs = []; window.__h = {}; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push({ m: o.message, d: (o.detail || '').slice(0, 300) }); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/transaction/demand-recovery/generate'); await sleep(2500);
await page.getByRole('button', { name: /^Generate$/ }).click(); await sleep(2000);
console.log('GENERATE empty:', JSON.stringify(await page.evaluate(() => window.__msgs)), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ant-message-notice')].map(e => e.innerText))), JSON.stringify(w));
await page.locator('#gen-division').click({ force: true }); await sleep(800);
console.log('DIVISIONS', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')].map(e => e.innerText.trim()))));
await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click(); await sleep(1500);
for (const id of ['gen-from', 'gen-to']) { await page.locator('#' + id).click({ force: true }); await sleep(600); console.log(id, JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')].map(e => e.innerText.trim()).slice(0, 8)))); await page.keyboard.press('Escape'); }
await browser.close();

import { start, go, sleep, text } from './lib.mjs';
const { browser, page } = await start();
const calls = [];
page.on('response', async (r) => { if (r.url().includes('/api/') && !r.url().includes('client-logs') && r.request().method() !== 'GET') { let b=''; try { b=(await r.text()).slice(0,300);} catch{} calls.push(`${r.request().method()} ${r.url().replace(/https?:\/\/[^/]+/, '').slice(0,80)} ${r.status()} ${b}`); } });
page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) console.log('REQ', r.url().replace(/https?:\/\/[^/]+/, ''), (r.postData()||'').slice(0,300)); });
await page.evaluate(() => { window.__msgs=[]; window.__h = {}; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push({ t:o.type, m: o.message, d: (o.detail || '').slice(0, 300) }); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/transaction/member-balance-transfer'); await sleep(2000);
await page.getByRole('button', { name: /Generate Transaction/ }).click(); await sleep(1500);
console.log('EMPTY generate msgs', JSON.stringify(await page.evaluate(() => window.__msgs)));
for (const id of ['mbt-debit', 'mbt-credit']) { await page.locator('#' + id).click({ force: true }); await sleep(500); console.log(id, 'opts', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ant-select-item-option')].map(e => e.innerText.trim()).slice(0, 12)))); await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').nth(id === 'mbt-debit' ? 1 : 3).click(); await sleep(500); }
await page.getByRole('button', { name: /Generate Transaction/ }).click(); await sleep(6000);
console.log((await text(page)).replace(/\s+/g, ' ').slice(0, 900));
console.log('MSGS', JSON.stringify(await page.evaluate(() => window.__msgs)), 'CALLS', JSON.stringify(calls));
await browser.close();

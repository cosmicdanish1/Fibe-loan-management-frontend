// Saves ONE loan application for a synthetic QA member through the real form (electronAPI stubbed).
import { start, go, sleep, text } from './lib.mjs';
const MB = process.env.QA_MB || '9999962667';
const { browser, page, api } = await start();
const calls = []; page.on('request', (r) => { if (r.url().includes('loan-application') && r.method()==='POST') { console.log('BODY', r.postData()); } });
page.on('response', async (r) => { if (r.url().includes('/api/') && r.request().method() !== 'GET') { let b = ''; try { b = (await r.text()).slice(0, 400); } catch {} calls.push(`${r.request().method()} ${r.url().replace(/https?:\/\/[^/]+/, '')} ${r.status()} ${b}`); } });
await page.evaluate(() => { window.__msgs = []; window.__h = {}; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push({ t: o.type, m: o.message, d: (o.detail || '').slice(0, 400) }); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/loan-application'); await sleep(1500);
await page.evaluate((mb) => window.__h['member-selected']({}, { memberNo: mb, memberName: 'QAPW MEMBERONE' }), MB); await sleep(3500);
await page.locator('#loanType').click({ force: true }); await sleep(400);
await page.locator('.ant-select-item-option', { hasText: 'REGULAR LOAN' }).first().click(); await sleep(600);
await page.locator('#loanAmount').fill('10000'); await sleep(2000);
await page.locator('textarea').first().fill('QA playwright synthetic loan application'); await sleep(500);
const t0 = Date.now(); await page.locator('button', { hasText: /^save$/i }).first().click(); await page.waitForFunction(() => (window.__msgs || []).length > 0, null, { timeout: 120000 }).catch(() => console.log('NO RESULT in 120s')); console.log('save took ms', Date.now() - t0);
console.log('MSGS', JSON.stringify(await page.evaluate(() => window.__msgs)));
console.log('WRITES', JSON.stringify(calls));
console.log('TEXT', (await text(page)).replace(/\s+/g, ' ').slice(0, 500));
await browser.close();

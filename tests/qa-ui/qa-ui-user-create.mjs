// Creates a synthetic QA user via Create/Modify Users (electronAPI stubbed). Test password is generated, not printed.
import { start, go, sleep, text } from './lib.mjs';
import crypto from 'node:crypto';
const UN = process.env.QA_NEWUSER || 'qa_pw_user1';
const PW = 'Qa!' + crypto.randomBytes(6).toString('hex');
const { browser, page } = await start();
const w = [];
page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) w.push('REQ ' + r.method() + ' ' + r.url().replace(/https?:\/\/[^/]+/, '') + ' ' + (r.postData() || '').replace(/"(password|confirm\w*)":"[^"]*"/gi, '"$1":"***"').slice(0, 400)); });
page.on('response', async (r) => { if (r.request().method() !== 'GET' && r.url().includes('/api/') && !r.url().includes('client-logs')) { let b = ''; try { b = (await r.text()).slice(0, 400); } catch {} w.push('RES ' + r.status() + ' ' + b.replace(/"(password|hash)\w*":"[^"]*"/gi, '"$1":"***"')); } });
await page.evaluate(() => { window.__msgs = []; window.__h = {}; window.electronAPI = { showMessageBox: async (o) => { window.__msgs.push({ t: o.type, m: o.message, d: (o.detail || '').slice(0, 300) }); return { response: 0 }; }, openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/user-management'); await sleep(2500);
await page.locator('#cmu-level').click({ force: true }); await sleep(500);
console.log('LEVELS', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ant-select-item-option')].map(e => e.innerText.trim()))));
await page.locator('.ant-select-item-option').first().click(); await sleep(500);
await page.getByPlaceholder('e.g. admin_pro_01').fill(UN);
const pw = page.getByPlaceholder('••••••••'); await pw.nth(0).fill(PW); await pw.nth(1).fill(PW);
// validation: mismatch first
await pw.nth(1).fill(PW + 'x'); await page.getByRole('button', { name: /^Save$/ }).click(); await sleep(2000);
console.log('MISMATCH msgs', JSON.stringify(await page.evaluate(() => window.__msgs)), 'dialogs', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ant-message-notice')].map(e => e.innerText))));
await pw.nth(1).fill(PW);
await page.getByRole('button', { name: /^Save$/ }).click(); await sleep(4000);
console.log('MSGS', JSON.stringify(await page.evaluate(() => window.__msgs)), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ant-message-notice')].map(e => e.innerText))));
console.log('WRITES', JSON.stringify(w));
await browser.close();

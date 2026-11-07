// Loan application form via UI with a stubbed window.electronAPI (headless Chrome has none).
// Stub captures showMessageBox dialogs and lets us inject the 'member-selected' IPC event.
// Synthetic QA member only. QA_SUBMIT=1 actually saves one application.
import { start, go, sleep, text } from './lib.mjs';
const MB = process.env.QA_MB || '9999962667';
const { browser, page, api } = await start();
const calls = [];
page.on('response', (r) => { if (r.url().includes('/api/')) calls.push(`${r.request().method()} ${r.url().replace(/https?:\/\/[^/]+/, '')} ${r.status()}`); });

await page.evaluate(() => {
  window.__msgs = []; window.__h = {}; window.__btn = 0;
  window.electronAPI = {
    showMessageBox: async (o) => { window.__msgs.push({ t: o.type, m: o.message, d: (o.detail || '').slice(0, 300), b: o.buttons }); return { response: window.__btn }; },
    openNewWindow: (p) => { window.__msgs.push({ openNewWindow: p }); },
    ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} },
  };
});
const msgs = async (clear = true) => { const m = await page.evaluate((c) => { const x = window.__msgs; if (c) window.__msgs = []; return x; }, clear); return JSON.stringify(m); };

await go(page, '#/loan-application'); await sleep(1500);
console.log('handler registered:', await page.evaluate(() => !!window.__h['member-selected']));

const save = async () => { await page.locator('button', { hasText: /^save$/i }).first().click(); await sleep(2500); };

// 1. validation chain
await save(); console.log('V1 empty:', await msgs());

await page.evaluate((mb) => window.__h['member-selected']({}, { memberNo: mb, memberName: 'QAPW MEMBERONE' }), MB);
await sleep(3500);
console.log('AFTER MEMBER:', (await text(page)).replace(/\s+/g, ' ').slice(0, 800));
await save(); console.log('V2 member only:', await msgs());

await page.locator('#loanType').click({ force: true }).catch(() => {}); await sleep(500);
console.log('LOAN TYPES', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ant-select-item-option')].map((e) => e.innerText.trim()))));
await page.locator('.ant-select-item-option', { hasText: 'REGULAR LOAN' }).first().click().catch(() => {}); await sleep(800);
await save(); console.log('V3 type only:', await msgs());

for (const bad of ['-500', '1e5', 'abc', '100.555', '0']) {
  await page.locator('#loanAmount').fill(bad); await sleep(300);
  console.log(`AMOUNT "${bad}" ->`, JSON.stringify(await page.locator('#loanAmount').inputValue()));
  await save(); console.log('  V4:', await msgs());
}
await page.locator('#loanAmount').fill('10000'); await sleep(1800);
await save(); console.log('V5 amount ok, no reason:', await msgs());
console.log('ELIG panel:', (await text(page)).replace(/\s+/g, ' ').match(/Eligib[^]{0,300}/)?.[0]);
console.log('CALLS', JSON.stringify(calls.slice(-14)));
await browser.close();

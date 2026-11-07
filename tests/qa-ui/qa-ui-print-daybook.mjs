import { start, go, sleep, text } from './lib.mjs';
const { browser, page } = await start();
await page.evaluate(() => { window.__h = {}; window.electronAPI = { showMessageBox: async () => ({ response: 0 }), openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/reports/daily/day-book'); await sleep(2500);
const d = page.getByPlaceholder(/select date/i).first(); await d.click(); await page.keyboard.press('Control+A'); await page.keyboard.type('07-Nov-2026'); await page.keyboard.press('Enter'); await sleep(800);
console.log('DATE', await d.inputValue());
await page.getByRole('button', { name: /load|generate|show/i }).first().click(); await sleep(6000);
console.log('SCREEN', (await text(page)).replace(/\s+/g, ' ').slice(0, 700));
const pr = page.getByRole('button', { name: /print/i }).first();
console.log('print disabled?', await pr.isDisabled());
if (!(await pr.isDisabled())) {
  await pr.click();
  let got = null;
  for (let i = 0; i < 12 && !got; i++) { await sleep(150); got = await page.evaluate(() => { const f = document.querySelector('iframe'); if (!f || !f.contentDocument) return null; const p = f.contentDocument.querySelector('pre'); return p ? p.innerText : null; }); }
  console.log('PRINT PRE', got ? '\n' + got.split('\n').slice(0, 40).join('\n') : 'none');
}
await browser.close();

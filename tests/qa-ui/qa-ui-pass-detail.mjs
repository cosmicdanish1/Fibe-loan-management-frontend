import { start, go, sleep, text } from './lib.mjs';
const { browser, page } = await start();
await page.evaluate(() => { window.__h = {}; window.electronAPI = { showMessageBox: async () => ({ response: 0 }), openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
await go(page, '#/transaction/pass-transactions'); await sleep(3000);
await page.getByText('J34234').first().click(); await sleep(1500);
console.log(JSON.stringify(await page.evaluate(() => { const rows=[...document.querySelectorAll('tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>c.innerText.trim())); const col=(i)=>rows.filter(r=>r[i]&&r[i]!=='—').length; return {rows:rows.length, mbno:col(2), name:col(3), head:col(4), transType:col(5), sample:rows.find(r=>r[1]==='VCH410')}; })));
console.log('details/dialog:', await page.locator('[role=dialog], .ant-modal, .ant-drawer').count());
await browser.close();

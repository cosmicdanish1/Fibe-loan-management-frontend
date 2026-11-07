// Read-only probe: opens each route (QA_ROUTES comma list), lists visible text start, controls, and any API failures. No clicks on write buttons.
import { start, go, sleep, text } from './lib.mjs';
const routes = (process.env.QA_ROUTES || '').split(',').filter(Boolean);
const { browser, page } = await start();
await page.evaluate(() => { window.__h = {}; window.electronAPI = { showMessageBox: async () => ({ response: 0 }), openNewWindow() {}, ipcRenderer: { on: (c, f) => { window.__h[c] = f; }, removeListener() {}, send() {} } }; });
for (const r of routes) {
  const calls = []; const on = (x) => { if (x.url().includes('/api/') && !x.url().includes('client-logs')) calls.push(`${x.request().method()} ${x.url().replace(/https?:\/\/[^/]+/, '').slice(0, 80)} ${x.status()}`); };
  page.on('response', on);
  await go(page, '#' + r); await sleep(2500);
  console.log('\n=== ' + r);
  console.log((await text(page)).replace(/\s+/g, ' ').slice(0, 600));
  console.log('CTRL', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('input,button,textarea,[role=combobox]')].map(e => (e.placeholder || e.innerText || e.getAttribute('aria-label') || e.id || e.type || '').trim().slice(0, 22) + (e.disabled ? '[d]' : '') + (e.tagName==='INPUT'&&e.value?'={'+e.value.slice(0,10)+'}':'')).slice(0, 40))));
  console.log('API', JSON.stringify(calls.slice(0, 12)));
  page.off('response', on);
}
await browser.close();

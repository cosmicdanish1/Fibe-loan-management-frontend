import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import fs from 'fs';

/**
 * ES-436: real Electron windows. Measures how long a window takes to appear after a menu click and
 * what the open fade-in / close fade-out look like (opacity sampled from the main process).
 * Needs: Vite on :5177, backend on :3001, `npm run build:main && npm run build:preload`.
 * Login: AdminDanish / SuperAdmin@2026 (local dev user) - override with FIBE_USER / FIBE_PASS.
 */
const ROUTES = [
  '/masters/saving-account-opening',
  '/masters/member-master',
  '/transaction/loan-repayment',
  '/reports/daily/day-book',
  '/utility/emi-chart',
  '/settings',
];
const results: any[] = [];

let app: ElectronApplication;
let main: Page;

test.describe.configure({ mode: 'serial' });
test.setTimeout(240000);

test.beforeAll(async () => {
  app = await electron.launch({ args: ['.'], env: { ...process.env, IS_DEV: 'true' } });
  const login = await app.firstWindow();
  await login.waitForSelector('input', { timeout: 90000 });
  await login.locator('input').first().fill(process.env.FIBE_USER || 'AdminDanish');
  await login.locator('input[type=password]').fill(process.env.FIBE_PASS || 'SuperAdmin@2026');
  await login.locator('button[type=submit]').click();
  // the dashboard opens in a second window and the login window closes
  await expect.poll(async () => (await dashboardPage())?.url() ?? '', { timeout: 90000 }).not.toBe('');
  main = (await dashboardPage())!;
  await main.waitForSelector('text=Quick Actions', { timeout: 90000 }).catch(() => undefined);
});

async function dashboardPage() {
  for (const p of app.windows()) { if (!p.isClosed() && /#\/dashboard/.test(p.url())) return p; }
  return undefined;
}

test.afterAll(async () => {
  fs.mkdirSync('tests/results', { recursive: true });
  fs.writeFileSync('tests/results/window-animation.json', JSON.stringify(results, null, 2));
  console.table(results.map(r => ({ pass: r.pass, route: r.route, 'created ms': r.created, 'visible ms': r.visible, 'open fade ms': r.openFade, 'content ms': r.content, 'close ms': r.close, 'loading bar seen': r.loadingSeen })));
  await app.close().catch(() => undefined);
});

for (const pass of ["first open", "second open (warm)"]) for (const route of ROUTES) {
  test(`${pass}: window opens and fades: ${route}`, async () => {
    const before = new Set(app.windows());
    const t0 = Date.now();
    const created = app.waitForEvent('window', { timeout: 30000 });
    await main.evaluate((r) => (window as any).electronAPI.openNewWindow(r), route);
    const page = await created;
    const tCreated = Date.now() - t0;

    // sample visible / opacity of the new window from the main process
    const samples: { t: number; v: boolean; o: number }[] = [];
    let tVisible = -1, tFull = -1;
    const url = page.url();
    for (let i = 0; i < 600; i++) {
      const s = await app.evaluate(({ BrowserWindow }, u) => {
        const w = BrowserWindow.getAllWindows().find(x => { try { return !x.isDestroyed() && x.webContents.getURL().includes(u); } catch { return false; } });
        try { return w ? { v: w.isVisible(), o: w.getOpacity() } : null; } catch { return null; }
      }, route);
      const t = Date.now() - t0;
      if (s) {
        samples.push({ t, ...s });
        if (s.v && tVisible < 0) tVisible = t;
        if (s.v && s.o >= 0.99 && tFull < 0) { tFull = t; break; }
      }
      await new Promise(r => setTimeout(r, 8));
    }
    const hasContent = await page.waitForSelector('.app-window, form, table, [class*=aw-]', { timeout: 30000 }).then(() => Date.now() - t0).catch(() => -1);
    // was a loading bar on screen at the moment the window became visible?
    const loadingSeen = await page.evaluate(() => !!document.querySelector('.ant-spin, [class*=loading-bar], [class*=Loading]')).catch(() => false);
    await page.screenshot({ path: `tests/results/anim-${route.replace(/\W+/g, '_')}.png` }).catch(() => undefined);

    // close: sample opacity until the window is gone
    const tc = Date.now();
    await app.evaluate(({ BrowserWindow }, u) => {
      const w = BrowserWindow.getAllWindows().find(x => { try { return !x.isDestroyed() && x.webContents.getURL().includes(u); } catch { return false; } });
      w?.close();
    }, route);
    const closeSeries: number[] = [];
    for (let i = 0; i < 200; i++) {
      const o = await app.evaluate(({ BrowserWindow }, u) => {
        const w = BrowserWindow.getAllWindows().find(x => { try { return !x.isDestroyed() && x.webContents.getURL().includes(u); } catch { return false; } });
        try { return w ? w.getOpacity() : null; } catch { return null; }
      }, route);
      if (o === null) break;
      closeSeries.push(Math.round(o * 100) / 100);
      await new Promise(r => setTimeout(r, 8));
    }
    const tClose = Date.now() - tc;
    const openFade = tFull >= 0 && tVisible >= 0 ? tFull - tVisible : -1;
    results.push({ pass, route, created: tCreated, visible: tVisible, openFade, content: hasContent, close: tClose, loadingSeen, closeSeries, openSamples: samples.filter(s => s.v).map(s => s.o) });

    expect(tVisible, 'window never became visible').toBeGreaterThan(0);
    if (pass !== 'first open') expect(tVisible, 'window took too long to appear (ms)').toBeLessThan(2500);
    expect(tClose, 'close took too long (ms)').toBeLessThan(600);
    expect(before.size).toBeGreaterThan(0);
  });
}

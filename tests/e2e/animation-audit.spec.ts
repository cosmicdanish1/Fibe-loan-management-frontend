import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import fs from 'fs';

/**
 * ES-436: in-window animation audit, run inside real Electron windows.
 * For each screen: which CSS animations / transitions run in the first second, how long they are,
 * whether anything loops forever when the screen is idle, and whether "reduce motion" and
 * "Calm mode" really switch the motion off.
 * Needs Vite (or `vite preview` + FIBE_DEV_URL) and the backend running; login AdminDanish / SuperAdmin@2026.
 */
const ROUTES = ['/masters/saving-account-opening', '/masters/member-master', '/transaction/loan-repayment',
  '/reports/daily/day-book', '/utility/emi-chart', '/settings'];
let app: ElectronApplication; let main: Page;
const report: any[] = [];
test.describe.configure({ mode: 'serial' });
test.setTimeout(240000);

const pageOf = (url: string) => app.windows().find(p => !p.isClosed() && p.url().includes(url));

test.beforeAll(async () => {
  app = await electron.launch({ args: ['.'], env: { ...process.env, IS_DEV: 'true' } });
  const login = await app.firstWindow();
  await login.waitForSelector('input', { timeout: 90000 });
  await login.locator('input').first().fill(process.env.FIBE_USER || 'AdminDanish');
  await login.locator('input[type=password]').fill(process.env.FIBE_PASS || 'SuperAdmin@2026');
  await login.locator('button[type=submit]').click();
  await expect.poll(() => app.windows().find(p => !p.isClosed() && p.url() && !/#\/login/.test(p.url()))?.url() ?? '', { timeout: 90000 }).not.toBe('');
  main = app.windows().find(p => !p.isClosed() && p.url() && !/#\/login/.test(p.url()))!;
  await main.waitForTimeout(3000);
});
test.afterAll(async () => {
  fs.mkdirSync('tests/results', { recursive: true });
  fs.writeFileSync('tests/results/animation-audit.json', JSON.stringify(report, null, 2));
  console.table(report.map(r => ({ route: r.route, 'window anim': r.windowAnim, 'running 1s': r.count, 'longest ms': r.longest, 'idle loops': r.idleLoops.join(',') || '-', 'reduce-motion ms': r.reducedAnim, 'calm ms': r.calmAnim })));
  await app.close().catch(() => undefined);
});

for (const route of ROUTES) {
  test(`animations on ${route}`, async () => {
    const created = app.waitForEvent('window', { timeout: 30000 });
    await main.evaluate((r) => (window as any).electronAPI.openNewWindow(r), route);
    const page = await created;
    await page.waitForSelector('.app-window', { timeout: 30000 }).catch(() => undefined);

    // everything that runs during the first second after the window has content
    const r = await page.evaluate(async () => {
      const seen = new Map<string, any>();
      const t0 = performance.now();
      while (performance.now() - t0 < 1000) {
        for (const a of document.getAnimations()) {
          const e: any = a.effect; const tm = e?.getComputedTiming?.() ?? {};
          const name = (a as any).animationName || (a as any).transitionProperty || 'transition';
          const target = (e?.target as HTMLElement | null);
          const key = `${(a as any).animationName ? 'anim' : 'trans'}:${name}:${target?.className?.toString?.().slice(0, 40) ?? ''}`;
          if (!seen.has(key)) seen.set(key, { kind: (a as any).animationName ? 'animation' : 'transition', name, duration: Math.round(Number(tm.duration) || 0), delay: Math.round(Number(tm.delay) || 0), iterations: tm.iterations === Infinity ? 'infinite' : tm.iterations });
        }
        await new Promise(r => requestAnimationFrame(() => r(null)));
      }
      const win = document.querySelector('.app-window:not(.aw-embed)') as HTMLElement | null;
      const cs = win ? getComputedStyle(win) : null;
      return { list: [...seen.values()], windowAnim: cs ? `${cs.animationName} ${cs.animationDuration}` : 'none (not a redesigned window)' };
    });
    // still looping after 2 s idle = wasted CPU / distracting
    await page.waitForTimeout(1500);
    const idle = await page.evaluate(() => document.getAnimations().filter(a => (a.effect as any)?.getComputedTiming?.().iterations === Infinity).map(a => (a as any).animationName || 'infinite'));

    // reduce motion (what the OS setting sends) and Calm mode (Settings switch, localStorage)
    const durationOf = () => page.evaluate(() => {
      const el = document.querySelector('.app-window:not(.aw-embed)') as HTMLElement | null;
      return el ? getComputedStyle(el).animationDuration : 'n/a';
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(300);
    const reducedAnim = await durationOf();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(300);
    await page.evaluate(() => { localStorage.setItem('onboarding.calm', '1'); window.dispatchEvent(new Event('onboarding:calm')); });
    await page.waitForTimeout(150);
    const calmAnim = await durationOf();
    await page.evaluate(() => { localStorage.removeItem('onboarding.calm'); window.dispatchEvent(new Event('onboarding:calm')); });

    const longest = Math.max(0, ...r.list.filter((x: any) => x.iterations !== 'infinite').map((x: any) => x.duration + x.delay));
    report.push({ route, windowAnim: r.windowAnim, count: r.list.length, longest, idleLoops: idle, reducedAnim, calmAnim, animations: r.list });
    await app.evaluate(({ BrowserWindow }, u) => { BrowserWindow.getAllWindows().forEach(w => { try { if (w.webContents.getURL().includes(u)) w.close(); } catch { /* gone */ } }); }, route);
    await new Promise(res => setTimeout(res, 400));
    expect(r.list.every((x: any) => x.duration < 1000 || x.iterations === 'infinite'), 'an animation longer than 1 s').toBe(true);
  });
}

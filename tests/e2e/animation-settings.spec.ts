import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';

/**
 * ES-436: Settings > Animations (Off / Fast fade / Slide / Zoom), adapt-to-this-PC, Calm mode, and pop-up motion.
 * Runs in real Electron windows. Needs Vite on :5177 + backend on :3001; login AdminDanish / SuperAdmin@2026.
 */
let app: ElectronApplication; let main: Page;
test.describe.configure({ mode: 'serial' });
test.setTimeout(240000);

const openWindow = async (route: string): Promise<Page> => {
  const created = app.waitForEvent('window', { timeout: 40000 });
  await main.evaluate((r) => (window as any).electronAPI.openNewWindow(r), route);
  return created;
};
const closeAll = async (route: string) => {
  await app.evaluate(({ BrowserWindow }, u) => { BrowserWindow.getAllWindows().forEach(w => { try { if (w.webContents.getURL().includes(u)) w.close(); } catch { /* gone */ } }); }, route);
  await new Promise(r => setTimeout(r, 500));
};
const setStorage = (page: Page, kv: Record<string, string | null>) => page.evaluate((o) => {
  for (const [k, v] of Object.entries(o)) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
}, kv);

test.beforeAll(async () => {
  test.setTimeout(240000);
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
test.afterAll(async () => { await app?.close().catch(() => undefined); });

test('Settings shows the Animations card with the four styles, and choosing one applies to every window', async () => {
  const settings = await openWindow('/settings');
  await settings.waitForSelector('text=Animations', { timeout: 40000 });
  for (const [label, mode] of [['Slide', 'slide'], ['Zoom', 'zoom'], ['Off', 'off'], ['Fast fade', 'fade']] as const) {
    await settings.getByRole('button', { name: new RegExp('^' + label) }).first().click();
    await expect.poll(() => settings.evaluate(() => document.documentElement.getAttribute('data-motion'))).toBe(mode);
    // another open window follows without a reload
    await expect.poll(() => main.evaluate(() => document.documentElement.getAttribute('data-motion')), { timeout: 5000 }).toBe(mode);
  }
  await settings.screenshot({ path: 'tests/results/animation-settings-card.png' });
  await closeAll('/settings');
});

for (const [mode, name] of [['fade', 'awWinFade'], ['slide', 'awWinSlide'], ['zoom', 'awWinZoom']] as const) {
  test(`a window opened with "${mode}" plays ${name} when it is shown`, async () => {
    await setStorage(main, { 'lms-motion': JSON.stringify({ style: mode, adaptive: false }), 'onboarding.calm': null });
    const page = await openWindow('/masters/member-master');
    await page.waitForSelector('.app-window', { timeout: 40000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('aw-entering')), { timeout: 8000 }).toBe(true);
    const anim = await page.evaluate(() => { const e = document.querySelector('.app-window:not(.aw-embed)') as HTMLElement; const c = getComputedStyle(e); return { name: c.animationName, dur: c.animationDuration }; });
    expect(anim.name).toBe(name);
    await closeAll('/masters/member-master');
  });
}

test('pop-ups (select dropdowns) animate softly and match the window style; Off removes it', async () => {
  for (const [style, expectMotion] of [['fade', true], ['off', false]] as const) {
    await setStorage(main, { 'lms-motion': JSON.stringify({ style, adaptive: false }) });
    const page = await openWindow('/masters/member-master');
    await page.waitForSelector('.ant-select', { timeout: 40000 });
    await page.waitForTimeout(800);
    await page.locator('.ant-select-selector').first().click();
    const seen = await page.evaluate(async () => {
      const out: number[] = []; const t0 = performance.now();
      while (performance.now() - t0 < 500) {
        for (const a of document.getAnimations()) {
          const t = (a.effect as any)?.target as HTMLElement | null;
          if (t && t.closest?.('.ant-select-dropdown')) out.push(Math.round(Number((a.effect as any).getComputedTiming().duration) || 0));
        }
        await new Promise(r => requestAnimationFrame(() => r(null)));
      }
      return out;
    });
    if (expectMotion) { expect(seen.length, 'dropdown should animate').toBeGreaterThan(0); expect(Math.max(...seen)).toBeLessThanOrEqual(400); }
    else expect(Math.max(0, ...seen), 'dropdown should be instant when Off').toBeLessThanOrEqual(1);
    await closeAll('/masters/member-master');
  }
});

test('Calm mode and a slow PC switch animation off; a middling PC shortens it', async () => {
  const settings = await openWindow('/settings');
  await settings.waitForSelector('text=Animations', { timeout: 40000 });
  await setStorage(settings, { 'lms-motion': JSON.stringify({ style: 'zoom', adaptive: true }), 'onboarding.calm': '1' });
  await settings.evaluate(() => window.dispatchEvent(new Event('onboarding:calm')));
  await expect.poll(() => settings.evaluate(() => document.documentElement.getAttribute('data-motion'))).toBe('off');
  await setStorage(settings, { 'onboarding.calm': null });
  await settings.evaluate(() => window.dispatchEvent(new Event('onboarding:calm')));
  await expect.poll(() => settings.evaluate(() => document.documentElement.getAttribute('data-motion'))).toBe('zoom');
  // pretend the PC measured slow: the cached result is read at start-up, so reload the window
  await setStorage(settings, { 'lms-motion-pc2': JSON.stringify({ tier: 'low', cores: 2, memoryGb: 2, avgFrameMs: 40, measuredAt: Date.now() }) });
  await settings.reload();
  await expect.poll(() => settings.evaluate(() => document.documentElement.getAttribute('data-motion')), { timeout: 30000 }).toBe('off');
  await setStorage(settings, { 'lms-motion-pc2': JSON.stringify({ tier: 'mid', cores: 4, memoryGb: 4, avgFrameMs: 22, measuredAt: Date.now() }) });
  await settings.reload();
  await expect.poll(() => settings.evaluate(() => document.documentElement.getAttribute('data-motion-lite')), { timeout: 30000 }).toBe('1');
  await setStorage(settings, { 'lms-motion-pc2': null, 'lms-motion': null });
  await closeAll('/settings');
});

test('the native window fade follows the choice: Off shows the window at full opacity at once', async () => {
  await setStorage(main, { 'lms-motion': JSON.stringify({ style: 'off', adaptive: false }) });
  await main.evaluate(() => (window as any).electronAPI.setMotionPreference('off'));
  const created = app.waitForEvent('window', { timeout: 40000 });
  await main.evaluate(() => (window as any).electronAPI.openNewWindow('/utility/emi-chart'));
  await created;
  let firstVisibleOpacity = -1;
  for (let i = 0; i < 1500 && firstVisibleOpacity < 0; i++) {
    firstVisibleOpacity = await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows().find(x => { try { return !x.isDestroyed() && x.webContents.getURL().includes('emi-chart'); } catch { return false; } });
      try { return w && w.isVisible() ? w.getOpacity() : -1; } catch { return -1; }
    });
    await new Promise(r => setTimeout(r, 6));
  }
  expect(firstVisibleOpacity).toBe(1);
  await closeAll('emi-chart');
  await setStorage(main, { 'lms-motion': null });
  await main.evaluate(() => (window as any).electronAPI.setMotionPreference('fade'));
});

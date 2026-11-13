import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';

/**
 * ES-473: a failed call must be shown to the user in plain words, not swallowed or turned into "not found" / "no data".
 * Real Electron windows with the network (or one endpoint) blocked. Needs Vite :5177 + backend :3001.
 */
let app: ElectronApplication; let main: Page;
test.describe.configure({ mode: 'serial' });
test.setTimeout(240000);

const openWindow = async (route: string): Promise<Page> => {
  await main.evaluate((r) => (window as any).electronAPI.openNewWindow(r), route);
  let page: Page | undefined;
  await expect.poll(() => { page = app.windows().find(w => !w.isClosed() && w.url().includes(route)); return !!page; }, { timeout: 60000 }).toBe(true);
  const p = page!;
  await p.waitForLoadState('domcontentloaded').catch(() => undefined);
  await p.waitForTimeout(4000);
  return p;
};
const closeRoute = async (route: string) => {
  await app.evaluate(({ BrowserWindow }, u) => { BrowserWindow.getAllWindows().forEach(w => { try { if (w.webContents.getURL().includes(u)) w.close(); } catch { /* gone */ } }); }, route);
  await new Promise(r => setTimeout(r, 500));
};
const visibleMessages = (p: Page) => p.evaluate(() =>
  [...document.querySelectorAll('.ant-modal-confirm-content, .ant-modal-confirm-title, .ant-message-notice-content')].map(e => (e as HTMLElement).innerText).join(' | '));

test.beforeAll(async () => {
  test.setTimeout(240000);
  app = await electron.launch({ args: ['.'], env: { ...process.env, IS_DEV: 'true' } });
  const login = await app.firstWindow();
  await login.waitForSelector('input', { timeout: 120000 });
  await login.locator('input').first().fill(process.env.FIBE_USER || 'AdminDanish');
  await login.locator('input[type=password]').fill(process.env.FIBE_PASS || 'SuperAdmin@2026');
  await login.locator('button[type=submit]').click();
  await expect.poll(() => app.windows().find(p => !p.isClosed() && p.url() && !/#\/login|devtools/.test(p.url()))?.url() ?? '', { timeout: 120000 }).not.toBe('');
  main = app.windows().find(p => !p.isClosed() && p.url() && !/#\/login|devtools/.test(p.url()))!;
  await main.waitForTimeout(3000);
});
test.afterAll(async () => { await app?.close().catch(() => undefined); });

const REPORTS: [string, string][] = [
  ['/reports/account-reports/loan-contributions-register', 'loan contributions'],
  ['/reports/account-reports/recovery-details', 'recovery details'],
  ['/reports/account-reports/share-certificate', 'share certificate'],
];
for (const [route, label] of REPORTS) {
  test(`${label}: server unreachable shows the reason, not "Member not found"`, async () => {
    const p = await openWindow(route);
    await p.route('**/api/**', r => r.abort('connectionrefused'));
    const member = p.locator('input[type=text]:visible, input:not([type]):visible').first();
    await member.fill('610026924');
    await p.getByRole('button', { name: /^(generate|show|view|load)$/i }).first().click();
    await expect.poll(() => visibleMessages(p), { timeout: 15000 }).toMatch(/Cannot reach the server/i);
    const msg = await visibleMessages(p);
    expect(msg, 'must not blame the member').not.toMatch(/Member not found/i);
    expect(msg).not.toMatch(/Failed to fetch|HTTP \d{3}/);
    await closeRoute(route);
  });
}

test('Member Balance Transfer: the head list failing to load is announced', async () => {
  const route = '/transaction/member-balance-transfer';
  await main.evaluate((r) => (window as any).electronAPI.openNewWindow(r), route);
  let p!: Page;
  await expect.poll(() => { const w = app.windows().find(x => !x.isClosed() && x.url().includes(route)); if (w) p = w; return !!w; }, { timeout: 60000 }).toBe(true);
  await p.route('**/reports/heads', r => r.abort('connectionrefused'));
  await p.reload();
  await expect.poll(() => visibleMessages(p), { timeout: 30000 }).toMatch(/Could not load the head list/i);
  await closeRoute(route);
});


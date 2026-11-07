import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import fs from 'fs';

/**
 * Re-check (no fixes) of the open front-end issues ES-33, 470, 471, 472, 473, 474 in real Electron windows.
 * It only OBSERVES and writes tests/results/frontend-issue-recheck.json. Needs Vite :5177 + backend :3001.
 */
let app: ElectronApplication; let main: Page;
const out: Record<string, any> = {};
test.describe.configure({ mode: 'serial' });
test.setTimeout(300000);

const openWindow = async (route: string): Promise<Page> => {
  const created = app.waitForEvent('window', { timeout: 40000 });
  await main.evaluate((r) => (window as any).electronAPI.openNewWindow(r), route);
  const p = await created;
  p.on('dialog', d => { d.dismiss().catch(() => undefined); });
  await p.waitForLoadState('domcontentloaded').catch(() => undefined);
  await p.waitForTimeout(3500);
  return p;
};
const closeRoute = async (route: string) => {
  await app.evaluate(({ BrowserWindow }, u) => { BrowserWindow.getAllWindows().forEach(w => { try { if (w.webContents.getURL().includes(u)) w.close(); } catch { /* gone */ } }); }, route);
  await new Promise(r => setTimeout(r, 500));
};

test.beforeAll(async () => {
  test.setTimeout(240000);
  app = await electron.launch({ args: ['.'], env: { ...process.env, IS_DEV: 'true' } });
  const login = await app.firstWindow();
  await login.waitForSelector('input', { timeout: 90000 });
  await login.locator('input').first().fill(process.env.FIBE_USER || 'AdminDanish');
  await login.locator('input[type=password]').fill(process.env.FIBE_PASS || 'SuperAdmin@2026');
  await login.locator('button[type=submit]').click();
  await expect.poll(() => app.windows().find(p => !p.isClosed() && p.url() && !/#\/login/.test(p.url()) && !/devtools/.test(p.url()))?.url() ?? '', { timeout: 90000 }).not.toBe('');
  main = app.windows().find(p => !p.isClosed() && p.url() && !/#\/login/.test(p.url()) && !/devtools/.test(p.url()))!;
  await main.waitForTimeout(3000);
});
test.afterAll(async () => {
  fs.mkdirSync('tests/results', { recursive: true });
  fs.writeFileSync('tests/results/frontend-issue-recheck.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
  await app?.close().catch(() => undefined);
});

test('ES-33 client logs hostname', async () => {
  out['ES-33'] = await main.evaluate(() => ({
    electronAPI_getHostname: typeof (window as any).electronAPI?.getHostname,
    electronAPI_getClientInfo: typeof (window as any).electronAPI?.getClientInfo,
    window_location_hostname: window.location.hostname,
  }));
});

/** Types into every visible text-like input and reports what stayed. */
const probeInputs = async (page: Page, label: string, values: string[]) => {
  return page.evaluate(async ({ values }) => {
    const res: any[] = [];
    const all = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
    const visibleAll = all.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    // very large grids (thousands of boxes): test an even sample of 60 and report the total
    const step = Math.max(1, Math.floor(visibleAll.length / 60));
    const inputs = visibleAll.filter((_, i) => i % step === 0).slice(0, 60);
    res.push({ totalVisibleInputs: all.length, sampled: inputs.length });
    for (const el of inputs) {
      const t = (el.getAttribute('type') || 'text').toLowerCase();
      if (['checkbox', 'radio', 'file', 'hidden', 'button', 'submit', 'password', 'range'].includes(t) || el.disabled || el.readOnly) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const entry: any = { type: t, name: el.name || el.id || el.placeholder || '', min: el.min || null, max: el.max || null, maxLength: el.maxLength > 0 ? el.maxLength : null };
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      entry.kept = {};
      for (const v of values) {
        setter.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(rr => setTimeout(rr, 20));
        entry.kept[v.length > 12 ? v.slice(0, 6) + '…(' + v.length + ')' : v] = el.value.length > 12 ? el.value.slice(0, 6) + '…(' + el.value.length + ')' : el.value;
      }
      setter.call(el, ''); el.dispatchEvent(new Event('input', { bubbles: true }));
      res.push(entry);
    }
    return res;
  }, { values });
};

test('ES-470 Modify Business Rules number fields', async () => {
  const p = await openWindow('/modify-business-rules');
  const r = await probeInputs(p, 'bizrules', ['abc', '-5', '99999999999', '1.2345']);
  const nums = r.filter(x => x.type === 'number' || /^\d|\-?\d/.test(Object.values(x.kept)[1] as string));
  out['ES-470'] = { visibleInputs: r.length, numberInputs: r.filter(x => x.type === 'number').length, withoutMin: r.filter(x => x.type === 'number' && !x.min).length, withoutMax: r.filter(x => x.type === 'number' && !x.max).length,
    acceptedNegative: r.filter(x => x.kept['-5'] === '-5').length, acceptedHuge: r.filter(x => x.kept['99999999999'] === '99999999999').length, sample: nums.slice(0, 6) };
  await closeRoute('/modify-business-rules');
});

for (const [id, route] of [['loan-sanction', '/loan-sanction'], ['saving-account-opening', '/masters/saving-account-opening'], ['member-balance-transfer', '/transaction/member-balance-transfer'], ['voucher-payment', '/transaction/receipt-payment/voucher-payment']] as const) {
  test(`ES-471/474 ${id}: what do the fields accept`, async () => {
    test.setTimeout(120000);
    const p = await openWindow(route);
    // most forms show their fields only after a member is chosen
    const first = p.locator('input:visible').first();
    await first.fill('610026924').catch(() => undefined);
    await first.press('Enter').catch(() => undefined);
    await p.waitForTimeout(4000);
    const r0 = await probeInputs(p, id, ['abc', '-5', '99999999999', 'x'.repeat(300)]);
    const r = r0.slice(1); r[0] = { ...(r[0] || {}), totalVisibleInputs: r0[0]?.totalVisibleInputs, sampled: r0[0]?.sampled };
    out[`ES-471/474 ${id}`] = {
      totalInputsOnScreen: r[0]?.totalVisibleInputs, sampled: r[0]?.sampled,
      acceptWords: r.filter(x => x.kept['abc'] === 'abc').map(x => x.name || x.type),
      acceptNegative: r.filter(x => x.type === 'number' && x.kept['-5'] === '-5').length,
      acceptHugeNumber: r.filter(x => x.kept['99999999999'] === '99999999999').length,
      accept300Chars: r.filter(x => (x.kept['xxxxxx…(300)'] || '').includes('300')).map(x => x.name || x.type),
      dateInputsWithoutMinMax: r.filter(x => x.type === 'date' && !x.min && !x.max).length,
    };
    await closeRoute(route);
  });
}

test('ES-472/473 a report when the server cannot be reached', async () => {
  const p = await openWindow('/reports/daily/day-book');
  await p.route('**/api/**', route => route.abort('connectionrefused'));
  const btn = p.getByRole('button', { name: /generate|show|view|search|load|refresh|submit/i }).first();
  const before = await p.evaluate(() => document.body.innerText.length);
  if (await btn.count()) { await btn.click().catch(() => undefined); }
  await p.waitForTimeout(3000);
  const text = await p.evaluate(() => document.body.innerText);
  out['ES-472 day-book (server unreachable)'] = {
    clickedButton: (await btn.count()) > 0,
    modalOrMessageShown: await p.evaluate(() => !!document.querySelector('.ant-modal-confirm, .ant-message-notice, .ant-notification-notice, [role=alert]')),
    mentionsServerOrNetwork: /reach the server|network|connection/i.test(text),
    hasRetry: /retry|try again/i.test(text),
    rawTechnicalText: /failed to fetch|HTTP \d{3}|ECONN|undefined|\[object/i.test(text),
    textSnippetAfter: text.replace(/\s+/g, ' ').slice(0, 300),
    pageChangedLength: text.length - before,
  };
  await p.screenshot({ path: 'tests/results/recheck-daybook-offline.png' }).catch(() => undefined);
  await closeRoute('/reports/daily/day-book');
});

test('ES-473 Member Master when the server cannot be reached', async () => {
  const p = await openWindow('/masters/member-master');
  await p.route('**/api/**', route => route.abort('connectionrefused'));
  const input = p.locator('input').first();
  await input.fill('610026924').catch(() => undefined);
  await input.press('Enter').catch(() => undefined);
  await p.waitForTimeout(3500);
  const text = await p.evaluate(() => document.body.innerText);
  out['ES-473 member-master lookup (server unreachable)'] = {
    anyMessageShown: await p.evaluate(() => !!document.querySelector('.ant-modal-confirm, .ant-message-notice, .ant-notification-notice, [role=alert]')),
    mentionsServerOrNetwork: /reach the server|network|connection|could not/i.test(text),
    rawTechnicalText: /failed to fetch|HTTP \d{3}|ECONN|undefined|\[object/i.test(text),
  };
  await p.screenshot({ path: 'tests/results/recheck-membermaster-offline.png' }).catch(() => undefined);
  await closeRoute('/masters/member-master');
});

test('ES-471/474 compulsory-deposit: size of the grid and cost of one keystroke', async () => {
  test.setTimeout(150000);
  const p = await openWindow('/transaction/compulsory-deposit');
  const first = p.locator('input:visible').first();
  await first.fill('610026924').catch(() => undefined);
  await first.press('Enter').catch(() => undefined);
  await p.waitForTimeout(6000);
  const count = await p.evaluate(() => document.querySelectorAll('input').length).catch(() => -1);
  const t0 = Date.now();
  const sample = p.locator('input[type=text]').nth(200);
  await sample.fill('abc', { timeout: 60000 }).catch(() => undefined);
  const ms = Date.now() - t0;
  const kept = await sample.inputValue().catch(() => 'n/a');
  out['ES-471/474 compulsory-deposit'] = { inputsOnScreenAfterMemberChosen: count, msToTypeThreeLettersInOneBox: ms, acceptedWords: kept === 'abc', valueKept: kept };
  await closeRoute('/transaction/compulsory-deposit');
});

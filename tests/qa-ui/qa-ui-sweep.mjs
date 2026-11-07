// Headless Playwright QA sweep (no screenshots). Run from Frontend/:
//   QA_USER=... QA_PASS=... node tests/qa-ui/qa-ui-sweep.mjs [out.json]
// Needs backend on :3001 and Vite on :5177. Uses installed Chrome (no browser download).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.QA_BASE || 'http://localhost:5177';
const USER = process.env.QA_USER, PASS = process.env.QA_PASS;
if (!USER || !PASS) { console.error('Set QA_USER and QA_PASS'); process.exit(1); }
const OUT = process.argv[2] || path.resolve('qa-ui-results.json');

const ROUTES = fs.readFileSync(path.resolve('tests/qa-ui/routes.txt'), 'utf8').split(/\s+/).filter(Boolean);
const NOISE = /popupClassName|deprecated|Warning:|favicon|DevTools|\[vite\]|React Router Future/i;
// Calls that legitimately 404 when a member simply has no photo/signature.
const EXPECTED_404 = /\/members\/master\/[^/]+\/(signature|photo\/)/;

const results = { startedAt: new Date().toISOString(), routes: {}, reports: {}, forms: [], summary: {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let cur = null;
const bucket = () => (results.routes[cur] ||= { fails: [], errs: [], pageErrors: [] });
page.on('response', (r) => {
  const u = r.url();
  if (!u.includes('/api/') || !cur) return;
  if (r.status() >= 400 && !EXPECTED_404.test(u)) {
    bucket().fails.push(`${r.request().method()} ${u.replace(/https?:\/\/[^/]+/, '')} -> ${r.status()}`);
  }
});
page.on('pageerror', (e) => cur && bucket().pageErrors.push(String(e.message).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error' && cur && !NOISE.test(m.text())) bucket().errs.push(m.text().slice(0, 200)); });

// ---------- login ----------
await page.goto(`${BASE}/#/login`);
await page.getByPlaceholder('Enter your username').fill(USER);
await page.getByPlaceholder('Enter your password').fill(PASS);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForResponse((r) => r.url().includes('/auth/login') && r.status() === 200, { timeout: 30000 });
await sleep(2500);
await page.evaluate(() => { location.hash = '#/dashboard'; });
await sleep(2500);

// ---------- 1. route sweep ----------
for (const r of (process.env.QA_SKIP_ROUTES ? [] : ROUTES)) {
  cur = r;
  bucket();
  await page.evaluate((h) => { location.hash = h; }, '#' + r);
  await sleep(1800);
  const info = await page.evaluate(() => {
    const t = document.body.innerText || '';
    return { len: t.length, eb: /something went wrong|try again|cannot read prop|unexpected error/i.test(t), head: t.slice(0, 120).replace(/\s+/g, ' ') };
  });
  Object.assign(results.routes[r], info);
}

// ---------- 2. report generation with default parameters ----------
const REPORTS = ROUTES.filter((r) => r.startsWith('/reports/') || ['/utility/emi-chart', '/utility/interest-receivable-received-statement', '/utility/premature-information/sb'].includes(r));
const BTN = /\b(load|generate|show|view|run|search|fetch|display|preview)\b/i;
for (const r of REPORTS) {
  cur = 'REPORT ' + r;
  console.log('report', r);
  results.reports[r] = { fails: [], clicked: null };
  const fails = results.reports[r].fails;
  const onResp = (resp) => { if (resp.url().includes('/api/') && resp.status() >= 400) fails.push(`${resp.request().method()} ${resp.url().replace(/https?:\/\/[^/]+/, '')} -> ${resp.status()}`); };
  page.on('response', onResp);
  await page.evaluate((h) => { location.hash = h; }, '#' + r);
  await sleep(3000);
  const btns = page.locator('button:not([disabled])').filter({ hasText: BTN }).filter({ hasNotText: /print|csv|excel|pdf|export|exit|reset|clear/i });
  await btns.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  results.reports[r].btnTexts = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => (b.innerText || '').trim().slice(0, 20) + (b.disabled ? '[d]' : '')));
  results.reports[r].hash = await page.evaluate(() => location.hash);
  if (await btns.count()) {
    results.reports[r].clicked = (await btns.first().innerText()).trim();
    const before = (await page.evaluate(() => document.body.innerText.length));
    await btns.first().click({ timeout: 5000 }).catch((e) => fails.push('click: ' + e.message.slice(0, 80)));
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await sleep(1500);
    const after = await page.evaluate(() => document.body.innerText.length);
    results.reports[r].grew = after > before;
    results.reports[r].eb = await page.evaluate(() => /something went wrong|try again|cannot read prop/i.test(document.body.innerText));
  }
  // Any dialog/toast raised by the report (error or validation message)?
  const dlg = await page.evaluate(() => [...document.querySelectorAll('.ant-modal-confirm, .ant-modal-body, .ant-message-notice, .ant-notification-notice')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160)).filter(Boolean));
  if (dlg.length) results.reports[r].dialogs = dlg;
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await page.getByRole('button', { name: /^(ok|close|cancel)$/i }).first().click({ timeout: 500 }).catch(() => {}); }
  page.off('response', onResp);
}

// ---------- 3. form checks ----------
const check = (name, ok, detail = '') => { results.forms.push({ name, ok, detail }); };
cur = 'FORMS';
fs.writeFileSync(OUT, JSON.stringify(results, null, 1)); // checkpoint before form checks
// Member Master: PAN / Aadhaar sanitising + submit validation
await page.evaluate(() => { location.hash = '#/masters/member'; });
await sleep(2000);
await page.getByPlaceholder('ABCDE1234F').fill('abc123xyz99999');
await page.getByPlaceholder('12 digits').fill('12ab34567890123456');
check('MemberMaster PAN capped at 10 chars', (await page.getByPlaceholder('ABCDE1234F').inputValue()).length <= 10);
check('MemberMaster Aadhaar digits only, max 12', /^\d{1,12}$/.test(await page.getByPlaceholder('12 digits').inputValue()));
await page.getByPlaceholder('Enter first name').fill('QAPW');
await page.getByPlaceholder('Enter last name').fill('VALID');
await page.getByRole('button', { name: /create/i }).first().click();
await sleep(1200);
check('MemberMaster rejects bad PAN/Aadhaar with message', /PAN must be|Aadhar? No must be/i.test(await page.evaluate(() => document.body.innerText)));

// Receipt: empty save, then negative amount
await page.evaluate(() => { location.hash = '#/transaction/receipt-payment/receipt'; });
await sleep(2000);
await page.getByRole('button', { name: 'Save' }).click();
await sleep(800);
check('Receipt empty save -> "Member Required"', /Member Required/i.test(await page.evaluate(() => document.body.innerText)));
await page.getByRole('button', { name: 'OK' }).click().catch(() => {});

// Wing dropdown API (ES-491)
const wingStatus = await page.evaluate(async () => {
  const tok = JSON.parse(sessionStorage.getItem('auth') || localStorage.getItem('auth') || 'null');
  return tok ? 'has-token-storage' : 'no-token-in-storage';
});
results.forms.push({ name: 'info: token storage', ok: true, detail: wingStatus });

// ---------- summary ----------
const badRoutes = Object.entries(results.routes).filter(([, v]) => v.fails?.length || v.pageErrors?.length || v.eb || (v.len !== undefined && v.len < 40));
results.summary = {
  routes: ROUTES.length,
  routesWithProblems: badRoutes.map(([k, v]) => ({ route: k, fails: [...new Set(v.fails)], pageErrors: v.pageErrors, eb: v.eb, len: v.len })),
  reportsRun: Object.values(results.reports).filter((v) => v.clicked).length,
  reportsNoButton: Object.entries(results.reports).filter(([, v]) => !v.clicked).map(([k]) => k),
  reportsWithFails: Object.entries(results.reports).filter(([, v]) => v.fails.length || v.eb).map(([k, v]) => ({ route: k, fails: [...new Set(v.fails)], eb: v.eb })),
  formFailures: results.forms.filter((f) => !f.ok),
};
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log(JSON.stringify(results.summary, null, 1));
await browser.close();

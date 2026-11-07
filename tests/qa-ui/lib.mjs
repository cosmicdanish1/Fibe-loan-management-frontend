import { chromium } from '@playwright/test';
export const BASE = 'http://localhost:5177';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function start() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const api = [];
  page.on('response', (r) => { if (r.url().includes('/api/') && r.request().method() !== 'GET') api.push({ m: r.request().method(), u: r.url().replace(/https?:\/\/[^/]+/, ''), s: r.status() }); });
  for (let i = 0; i < 4; i++) {
    await page.goto(`${BASE}/#/login`); await sleep(2500);
    if (await page.getByPlaceholder('Enter your username').count()) break;
    await page.reload(); await sleep(3000);
  }
  await page.getByPlaceholder('Enter your username').fill(process.env.QA_USER);
  await page.getByPlaceholder('Enter your password').fill(process.env.QA_PASS);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForResponse((r) => r.url().includes('/auth/login') && r.status() === 200);
  await sleep(2500);
  return { browser, page, api };
}
export const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await sleep(2500); };
export const text = (page) => page.evaluate(() => document.body.innerText);

import { start, go, sleep } from './lib.mjs';
import fs from 'node:fs';
const { browser, page } = await start();
const out = process.argv[2];
for (const [route, label] of [['#/reports/daily/day-book', 'daybook'], ['#/reports/daily/cash-book', 'cashbook'], ['#/reports/daily/day-book-cd', 'daybookcd']]) {
  await go(page, route);
  const load = page.getByRole('button', { name: /load report|generate/i }).first();
  await load.waitFor({ timeout: 10000 }).catch(() => {});
  await load.click().catch(() => {});
  await sleep(5000);
  const csv = page.getByRole('button', { name: /csv/i }).first();
  try {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), csv.click()]);
    const f = `${out}/${label}.csv`;
    await dl.saveAs(f);
    console.log(label, 'downloaded', dl.suggestedFilename(), fs.statSync(f).size, 'bytes');
  } catch (e) { console.log(label, 'NO DOWNLOAD', e.message.slice(0, 80)); }
}
await browser.close();

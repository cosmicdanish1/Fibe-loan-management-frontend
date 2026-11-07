// Journal Transfer, Member-To-Member: can a member be chosen for a row at all?
import { start, go, sleep } from './lib.mjs';
const { browser, page } = await start();
await go(page, '#/transaction/journal-transfer'); await sleep(1000);
await page.locator('button', { hasText: /Member-To-Member/i }).click(); await sleep(500);
await page.locator('button', { hasText: /add row/i }).first().click(); await sleep(500);
const row = page.locator('tbody tr').first();
const cells = await row.locator('td').allInnerTexts();
console.log('cells', JSON.stringify(cells.map(c => c.trim())));
const modal = () => page.evaluate(() => !!document.querySelector('.ant-modal, [role=dialog]') && /Member Lookup/i.test(document.body.innerText));
for (const i of [0, 1]) {
  await row.locator('td').nth(i).click(); await sleep(700);
  await row.locator('td').nth(i).dblclick(); await sleep(700);
  console.log(`cell ${i} click/dblclick opens lookup:`, await modal());
}
console.log('inputs in member cells:', await row.locator('td').nth(0).locator('input,button').count(), await row.locator('td').nth(1).locator('input,button').count());
await browser.close();

// Screens fed by double-wrapped endpoints: do they actually show data?
import { start, go, sleep, text } from './lib.mjs';
const { browser, page } = await start();
const t = async () => (await text(page)).replace(/\s+/g, ' ');
// Find utility (search/global)
await go(page, '#/utility/find'); await sleep(1000);
const box = page.locator('input').first(); await box.fill('ANAND'); await box.press('Enter'); await sleep(3500);
console.log('FIND ANAND ->', (await t()).slice(0, 380));
// Member status summary
await go(page, '#/masters/member-status'); await sleep(3000);
console.log('MEMBER STATUS ->', (await t()).slice(0, 380));
// Notification centre
await go(page, '#/utility/notification-centre'); await sleep(3000);
console.log('NOTIF CENTRE ->', (await t()).slice(0, 380));
// Dividend payment pending list
await go(page, '#/transaction/receipt-payment/dividend-payment'); await sleep(3000);
console.log('DIVIDEND PAY ->', (await t()).slice(0, 380));
// Group insurance context
await go(page, '#/administration/group-insurance'); await sleep(3000);
console.log('GROUP INS ->', (await t()).slice(0, 380));
// Settings preferences / financial year
await go(page, '#/financial-year/closing'); await sleep(3000);
console.log('FY CLOSING ->', (await t()).slice(0, 380));
await browser.close();

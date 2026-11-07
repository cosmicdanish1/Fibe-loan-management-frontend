// Saving voucher via UI on QA account 213 (member 9999962472, QA data only).
// Checks: Account Balances panel vs API, overdraft refusal, withdrawal posting.
import { start, go, sleep, text } from './lib.mjs';
const ACC = process.env.QA_SB_ACC || '213';
const { browser, page, api } = await start();
const dialogs = () => page.evaluate(() => [...document.querySelectorAll('.ant-modal-body,.ant-message-notice,.ant-notification-notice')].map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 260)));
const closeDialogs = async () => { for (let i = 0; i < 3; i++) { await page.locator('.ant-modal-confirm-btns button, .ant-modal-footer button').first().click({ timeout: 700 }).catch(() => {}); await sleep(300); } };

async function openAccount() {
  await go(page, '#/transaction/saving'); await sleep(800);
  const acc = page.getByPlaceholder(/Enter or pick an account/);
  await acc.fill(ACC); await acc.press('Enter'); await sleep(3000);
}
async function setType(label) {
  await page.locator('#sv-type').click({ force: true }); await sleep(500);
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', { hasText: label }).first().click(); await sleep(500);
  const now = await page.locator('.ant-select-selection-item[title]').first().getAttribute('title');
  return now;
}
const panel = async () => {
  const t = await text(page);
  const g = (k) => t.match(new RegExp(k + '\\s*₹([\\d,.-]+)'))?.[1];
  return { current: g('CURRENT BALANCE'), available: g('AVAILABLE BAL'), withdrawable: g('WITHDRAWABLE'), header: t.match(/Member \d+ — ₹([\d,.]+)/)?.[1], history: !/Enter A\/C No to view history/.test(t) };
};

// 1. panel vs API
await openAccount();
const p0 = await panel();
console.log('PANEL', JSON.stringify(p0));

// 2. overdraft withdrawal (must be refused)
const typeNow = await setType('Withdrawal');
console.log('type selected:', typeNow);
if (/Withdrawal/.test(typeNow || '')) {
  await page.getByPlaceholder('0.00').fill('99999');
  await page.getByPlaceholder('Enter narration…').fill('QA playwright overdraft attempt');
  const b = api.length;
  await page.locator('button', { hasText: /^save$/i }).click(); await sleep(3500);
  console.log('OVERDRAFT calls', JSON.stringify(api.slice(b)), 'dialogs', JSON.stringify(await dialogs()));
  await closeDialogs();
  // 3. small withdrawal within balance
  await page.getByPlaceholder('0.00').fill('5');
  await page.getByPlaceholder('Enter narration…').fill('QA playwright saving withdrawal');
  const b2 = api.length;
  await page.locator('button', { hasText: /^save$/i }).click(); await sleep(3500);
  console.log('WITHDRAW 5 calls', JSON.stringify(api.slice(b2)), 'dialogs', JSON.stringify(await dialogs()));
}
await browser.close();

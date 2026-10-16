import { useCallback, useEffect, useState } from 'react';

/**
 * Report views: how one report's data can be drawn.
 *
 *  - legacy    the original layout, unchanged. Always available.
 *  - bento     tiles and charts for a quick read of the day.
 *  - terminal  dense rows with search and keyboard movement.
 *  - editorial a paper-statement look for reading and handing over.
 *
 * Which views a report offers, and which one it opens with, is set on the
 * Settings → Reports tab and stored per user in this browser profile.
 */

export type ReportViewId = 'legacy' | 'bento' | 'terminal' | 'editorial';

export const ALL_VIEW_IDS: ReportViewId[] = ['legacy', 'bento', 'terminal', 'editorial'];

export const VIEW_META: Record<ReportViewId, { label: string; short: string; desc: string }> = {
  legacy:    { label: 'Legacy',           short: 'Legacy',    desc: 'The original report layout, exactly as before' },
  bento:     { label: 'Bento',            short: 'Bento',     desc: 'Tiles and charts: balances, cash vs transfer, top heads' },
  terminal:  { label: 'Dense Terminal',   short: 'Terminal',  desc: 'Compact rows with search, sorting and keyboard movement' },
  editorial: { label: 'Editorial Ledger', short: 'Ledger',    desc: 'A paper-statement look for reading and handing over' },
};

export interface ReportViewDef {
  /** Stable id used in storage. Never rename once shipped. */
  id: string;
  title: string;
  group: string;
  /** Views this report has been built for. */
  available: ReportViewId[];
  /** Views switched on until the user changes them. */
  defaultEnabled: ReportViewId[];
  /** View the report opens with until the user changes it. */
  defaultView: ReportViewId;
  note?: string;
}

/** Add a report here once it has Pro views built. */
export const REPORT_VIEW_REGISTRY: ReportViewDef[] = [
  {
    id: 'daily.cash-book',
    title: '1.2 Cash-Book',
    group: 'Daily',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Head-wise cash book with Cash and Transfer columns',
  },
  {
    id: 'daily.cash-book-receiptwise',
    title: '1.1 Cash-Book (Receiptwise Rough)',
    group: 'Daily',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Voucher-wise cash book: every voucher with its ledger legs',
  },
  {
    id: 'account.closing-register',
    title: '12.1 Account Closing Register',
    group: 'Account Reports',
    available: ['legacy', 'bento', 'terminal'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Closed FD and RD accounts for a month, with the amount paid out',
  },
  {
    id: 'account.recurring-details',
    title: '12.4 Recurring Details',
    group: 'Account Reports',
    available: ['legacy', 'bento', 'terminal'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'A member’s RD by financial year: installments, missed, balance',
  },
  {
    id: 'account.recovery-details',
    title: '12.5 Recovery Details',
    group: 'Account Reports',
    available: ['legacy', 'bento', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'editorial'],
    defaultView: 'legacy',
    note: 'A member’s monthly demand: loan, deposit and charge recoveries',
  },
  {
    id: 'account.loan-contributions',
    title: '12.6 Loan Contributions Register',
    group: 'Account Reports',
    available: ['legacy', 'bento', 'terminal'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'A member’s loan payments in a date range, loan by loan',
  },
  {
    id: 'account.lien-information',
    title: '12.7 Lien Account Information',
    group: 'Account Reports',
    available: ['legacy', 'bento', 'terminal'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'RD held as security for loans',
  },
  {
    id: 'account.consolidation-chain',
    title: '12.8 Loan Consolidation Chain',
    group: 'Account Reports',
    available: ['legacy', 'bento'],
    defaultEnabled: ['legacy', 'bento'],
    defaultView: 'legacy',
    note: 'The chain of loans that settled into each other, with balances',
  },
  {
    id: 'daily.day-book-cd',
    title: '1.4 Day-Book [CD]',
    group: 'Daily',
    available: ['legacy', 'bento', 'terminal'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Compulsory deposit transactions of the day: deposits and withdrawals, cash and transfer',
  },
  {
    id: 'daily.consolidation',
    title: '1.5 Consolidation Of Daily A/c',
    group: 'Daily',
    available: ['legacy', 'bento', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'editorial'],
    defaultView: 'legacy',
    note: 'Every account head touched on the day, grouped Receipt / Payment, with member lines',
  },
  {
    id: 'monthly.cash-book',
    title: '4.2 Cash Book Monthly',
    group: 'Monthly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Month summary by account head: receipts, payments, opening and closing',
  },
  {
    id: 'monthly.detail-ledger',
    title: '4.3 Detail Ledger',
    group: 'Monthly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Every entry of one account head with running balance',
  },
  {
    id: 'monthly.bank-detail-ledger',
    title: '4.4 Bank Detail Ledger',
    group: 'Monthly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Every entry of one bank account with running balance',
  },
  {
    id: 'monthly.defaulter-list',
    title: '4.5 Defaulter List',
    group: 'Monthly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Loans above a minimum balance; Pro views list every loan, not one page',
  },
  {
    id: 'monthly.new-loan-disbursed',
    title: '4.6 New Loan Disbursed',
    group: 'Monthly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Loans disbursed in a date range, by type and member',
  },
  {
    id: 'monthly.member-loan-ledger',
    title: '4.7 Member Loan Ledger',
    group: 'Monthly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Loan ledger of one member and loan case with running balance',
  },
  {
    id: 'monthly.loan-statement',
    title: '4.8 Loan Account Statement',
    group: 'Monthly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Installment-by-installment record of one loan',
  },
  {
    id: 'general-ledger',
    title: '3. General Ledger',
    group: 'Ledgers',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Head-wise account statement with opening, payments, receipts and closing',
  },
  {
    id: 'member-ledger-report',
    title: '2. Member Ledger Report',
    group: 'Ledgers',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Personal ledger of one member for one account head',
  },
  {
    id: 'yearly.pl-balance-sheet',
    title: '5.1 P & L / Balance Sheet',
    group: 'Yearly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'editorial'],
    defaultView: 'legacy',
    note: 'Balance Sheet tab: assets and liabilities as on a date',
  },
  {
    id: 'yearly.voters-list',
    title: '5.2.1 Voters / Withdrawal List',
    group: 'Yearly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Members list; Pro views list every member, not one page',
  },
  {
    id: 'yearly.dividend-report',
    title: '5.3.1 Dividend Report',
    group: 'Yearly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Dividend by member for a financial year and rate',
  },
  {
    id: 'yearly.dividend-paid',
    title: '5.3.2 Dividend Paid',
    group: 'Yearly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Dividend payments in a date range, by wing and mode',
  },
  {
    id: 'yearly.interest-list',
    title: '5.3.3 Int. List CD/MD/SHRt',
    group: 'Yearly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Interest distribution for CD, MD and share deposits',
  },
  {
    id: 'yearly.member-loan-detail',
    title: '5.5 Member Loan Detail',
    group: 'Yearly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Loan by loan for a member range, with sureties',
  },
  {
    id: 'yearly.annual-member-statement',
    title: '5.7 Annual Member Statement',
    group: 'Yearly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Thrift, share and loan balances per member as on a date',
  },
  {
    id: 'yearly.yearly-member-statement',
    title: '5.8 Yearly Member Statement',
    group: 'Yearly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Shares, compulsory deposit and loans per member for a period',
  },
  {
    id: 'yearly.member-ledger',
    title: '5.9 Member Ledger',
    group: 'Yearly',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Share, loans and compulsory deposit side by side, date by date',
  },
  {
    id: 'member-statement',
    title: '5.10 / 9.4 Member Statement',
    group: 'Member statements',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'A member’s balances head by head: deposits and loans as on a date',
  },
  {
    id: 'member-detail-ledger',
    title: '6. Member Detail Ledger',
    group: 'Ledgers',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Every entry of a member across account heads in a date range',
  },
  {
    id: 'account-balance',
    title: '8. Account Balance',
    group: 'Balances',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Shares, deposits, loans and net position for a member range',
  },
  {
    id: 'member-statement.saving',
    title: '9.1 Saving Statement',
    group: 'Member statements',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Deposits, withdrawals and running balance of a member’s savings',
  },
  {
    id: 'member-statement.rd',
    title: '9.2 RD Statement',
    group: 'Member statements',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'A member’s recurring deposit, financial year by financial year',
  },
  {
    id: 'surety-register',
    title: '10. Surety Register',
    group: 'Registers',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Loans with their sureties and the balance outstanding',
  },
  {
    id: 'deposit-due-date-register',
    title: '11. Deposit Due Date Register',
    group: 'Registers',
    available: ['legacy', 'bento', 'terminal', 'editorial'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Deposits falling due in a date range with maturity amounts',
  },
  {
    id: 'daily.day-book',
    title: '1.3 Day-Book',
    group: 'Daily',
    available: ['legacy', 'bento', 'terminal'],
    defaultEnabled: ['legacy', 'bento', 'terminal'],
    defaultView: 'legacy',
    note: 'Daily journal: payments and receipts grouped by head, with member, voucher and user',
  },
];

export interface ReportViewPref { enabled: ReportViewId[]; defaultView: ReportViewId }
type PrefMap = Record<string, ReportViewPref>;

const PREF_KEY = 'lms-report-views-v1';
const LAST_KEY = 'lms-report-views-last-v1';
const CHANNEL = 'lms_report_views';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch { return fallback; }
};

const writeJson = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

const notify = () => {
  try { const bc = new BroadcastChannel(CHANNEL); bc.postMessage({ changed: Date.now() }); bc.close(); } catch { /* ignore */ }
  window.dispatchEvent(new Event(CHANNEL));
};

export const getReportDef = (id: string): ReportViewDef | undefined => REPORT_VIEW_REGISTRY.find(r => r.id === id);

/** Saved preference merged with the report's defaults. Legacy can never be switched off. */
export const getReportPref = (id: string): ReportViewPref => {
  const def = getReportDef(id);
  const saved = readJson<PrefMap>(PREF_KEY, {})[id];
  const available = def?.available ?? ['legacy'];
  const picked = (saved?.enabled ?? def?.defaultEnabled ?? ['legacy']).filter(v => available.includes(v));
  const enabled = ALL_VIEW_IDS.filter(v => v === 'legacy' || picked.includes(v));
  const wanted = saved?.defaultView ?? def?.defaultView ?? 'legacy';
  return { enabled, defaultView: enabled.includes(wanted) ? wanted : 'legacy' };
};

export const setReportPref = (id: string, pref: ReportViewPref) => {
  const all = readJson<PrefMap>(PREF_KEY, {});
  all[id] = pref;
  writeJson(PREF_KEY, all);
  notify();
};

export const resetReportPref = (id: string) => {
  const all = readJson<PrefMap>(PREF_KEY, {});
  delete all[id];
  writeJson(PREF_KEY, all);
  notify();
};

export const hasCustomPref = (id: string): boolean => Boolean(readJson<PrefMap>(PREF_KEY, {})[id]);

const getLast = (id: string): ReportViewId | undefined => readJson<Record<string, ReportViewId>>(LAST_KEY, {})[id];
const setLast = (id: string, view: ReportViewId) => {
  const all = readJson<Record<string, ReportViewId>>(LAST_KEY, {});
  all[id] = view;
  writeJson(LAST_KEY, all);
};

/**
 * The views a report offers and the one on screen.
 * The last view the user picked is remembered; if Settings later switches that
 * view off, the report falls back to its configured default.
 */
export function useReportViews(reportId: string) {
  const [pref, setPref] = useState<ReportViewPref>(() => getReportPref(reportId));
  const [picked, setPicked] = useState<ReportViewId | undefined>(() => getLast(reportId));

  useEffect(() => {
    const refresh = () => setPref(getReportPref(reportId));
    let bc: BroadcastChannel | null = null;
    try { bc = new BroadcastChannel(CHANNEL); bc.onmessage = refresh; } catch { /* ignore */ }
    window.addEventListener(CHANNEL, refresh);
    window.addEventListener('storage', refresh);
    return () => { bc?.close(); window.removeEventListener(CHANNEL, refresh); window.removeEventListener('storage', refresh); };
  }, [reportId]);

  const view: ReportViewId = picked && pref.enabled.includes(picked) ? picked : pref.defaultView;

  const setView = useCallback((next: ReportViewId) => {
    setPicked(next);
    setLast(reportId, next);
  }, [reportId]);

  return { enabled: pref.enabled, view, setView };
}

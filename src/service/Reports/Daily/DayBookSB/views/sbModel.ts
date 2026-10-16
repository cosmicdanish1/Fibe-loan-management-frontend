export { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface SBEntry {
  srNo: number;
  accNo: string;
  acName: string;
  depositCash: number;
  depositTransfer: number;
  withdrawalCash: number;
  withdrawalTransfer: number;
}

export interface SBData {
  date: string;
  openingBalance: number;
  totalDepositCash: number;
  totalDepositTransfer: number;
  totalDeposit: number;
  totalWithdrawalCash: number;
  totalWithdrawalTransfer: number;
  totalWithdrawal: number;
  totalCashInHand: number;
  closingBalance: number;
  totalTransactions: number;
  entries: SBEntry[];
}

/** One line of the flat list the CD (and all-heads) day book returns. */
interface FlatEntry {
  mbNo: string;
  memberName: string;
  transactionType: 'CR' | 'DR';
  amount: number;
  modeOfPay?: string;
}

/**
 * The CD day book comes back as a flat list (one line per ledger leg: member, CR / DR, amount, mode).
 * The window shows it like the savings day book: one row per transaction, deposit and withdrawal
 * split into cash and transfer, so the flat list is turned into that shape here.
 */
export const adaptFlatDayBook = (d: any): SBData => {
  const flat: FlatEntry[] = Array.isArray(d?.entries) ? d.entries : [];
  const entries: SBEntry[] = flat.map((e, i) => {
    const amt = Number(e.amount) || 0;
    const cash = String(e.modeOfPay || 'C').toUpperCase() === 'C';
    const deposit = e.transactionType === 'CR';
    return {
      srNo: i + 1,
      accNo: e.mbNo,
      acName: e.memberName,
      depositCash: deposit && cash ? amt : 0,
      depositTransfer: deposit && !cash ? amt : 0,
      withdrawalCash: !deposit && cash ? amt : 0,
      withdrawalTransfer: !deposit && !cash ? amt : 0,
    };
  });
  const sum = (k: keyof SBEntry) => entries.reduce((s, e) => s + (e[k] as number), 0);
  const totalDepositCash = sum('depositCash');
  const totalDepositTransfer = sum('depositTransfer');
  const totalWithdrawalCash = sum('withdrawalCash');
  const totalWithdrawalTransfer = sum('withdrawalTransfer');
  const totalDeposit = totalDepositCash + totalDepositTransfer;
  const totalWithdrawal = totalWithdrawalCash + totalWithdrawalTransfer;
  const openingBalance = Number(d?.openingBalance) || 0;
  return {
    date: d?.date ?? '',
    openingBalance,
    totalDepositCash, totalDepositTransfer, totalDeposit,
    totalWithdrawalCash, totalWithdrawalTransfer, totalWithdrawal,
    totalCashInHand: openingBalance + totalDeposit,
    closingBalance: openingBalance + totalDeposit - totalWithdrawal,
    totalTransactions: entries.length,
    entries,
  };
};

/** True when the response is the flat list (CD) rather than the savings shape. */
export const isFlatDayBook = (d: any): boolean => {
  const first = d?.entries?.[0];
  return Boolean(first && 'transactionType' in first);
};

export interface SBDerived {
  members: number;
  topDeposits: { key: string; name: string; value: number }[];
  topWithdrawals: { key: string; name: string; value: number }[];
  cashPctDeposit: number;
  cashPctWithdrawal: number;
}

export const deriveSB = (d: SBData): SBDerived => {
  const group = (pick: (e: SBEntry) => number) => {
    const m = new Map<string, { key: string; name: string; value: number }>();
    d.entries.forEach(e => {
      const v = pick(e);
      if (v <= 0) return;
      const k = `${e.accNo}|${e.acName}`;
      const g = m.get(k) ?? { key: k, name: `${e.acName || 'Member'} · ${e.accNo}`, value: 0 };
      g.value += v; m.set(k, g);
    });
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 6);
  };
  return {
    members: new Set(d.entries.map(e => e.accNo)).size,
    topDeposits: group(e => e.depositCash + e.depositTransfer),
    topWithdrawals: group(e => e.withdrawalCash + e.withdrawalTransfer),
    cashPctDeposit: d.totalDeposit > 0 ? (d.totalDepositCash / d.totalDeposit) * 100 : 0,
    cashPctWithdrawal: d.totalWithdrawal > 0 ? (d.totalWithdrawalCash / d.totalWithdrawal) * 100 : 0,
  };
};

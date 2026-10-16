import dayjs from 'dayjs';
export { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface LoanTx {
  transactionDate: string;
  transactionType: string;
  transactionAmount: number;
  principalAmount?: number;
  interestAmount?: number;
  penalAmount?: number;
  narration?: string;
  voucherNo?: string;
}

export interface LoanContribution {
  loanDetails: {
    loanType: string;
    loanCaseNo: string;
    loanAmount: number;
    disbursementDate?: string;
    interestRate: number;
    numberOfInstallments: number;
    installmentAmount: number;
    outstandingBalance: number;
    purpose?: string;
  };
  transactions: LoanTx[];
}

export interface ContribData {
  memberNo: string;
  memberName: string;
  address?: string;
  fromDate: string;
  toDate: string;
  loanContributions: LoanContribution[];
  totalTransactions: number;
  summary?: { totalDebits?: number; totalCredits?: number };
}

export interface ContribRow extends LoanTx {
  id: string;
  loanLabel: string;
  loanCaseNo: string;
}

export interface ContribDerived {
  rows: ContribRow[];
  credits: number;
  debits: number;
  principal: number;
  interest: number;
  penal: number;
  perLoan: { key: string; label: string; credits: number; count: number; repaidPct: number; outstanding: number; amount: number }[];
  monthly: { month: string; value: number }[];
}

export const deriveContrib = (d: ContribData): ContribDerived => {
  const rows: ContribRow[] = [];
  const months = new Map<string, number>();
  let credits = 0; let debits = 0; let principal = 0; let interest = 0; let penal = 0;
  const perLoan = d.loanContributions.map((lc, li) => {
    const label = `${lc.loanDetails.loanType} #${lc.loanDetails.loanCaseNo}`;
    let c = 0;
    (lc.transactions ?? []).forEach((t, ti) => {
      const amt = Number(t.transactionAmount) || 0;
      const isCredit = String(t.transactionType).toUpperCase() === 'CR';
      if (isCredit) { credits += amt; c += amt; } else { debits += amt; }
      principal += Number(t.principalAmount) || 0;
      interest += Number(t.interestAmount) || 0;
      penal += Number(t.penalAmount) || 0;
      if (t.transactionDate && isCredit) {
        const m = dayjs(t.transactionDate).format('YYYY-MM');
        months.set(m, (months.get(m) ?? 0) + amt);
      }
      rows.push({ ...t, id: `${li}-${ti}`, loanLabel: label, loanCaseNo: lc.loanDetails.loanCaseNo });
    });
    const amount = Number(lc.loanDetails.loanAmount) || 0;
    const outstanding = Number(lc.loanDetails.outstandingBalance) || 0;
    return {
      key: lc.loanDetails.loanCaseNo + li, label, credits: c, count: (lc.transactions ?? []).length,
      repaidPct: amount > 0 ? Math.max(0, Math.min(100, ((amount - outstanding) / amount) * 100)) : 0,
      outstanding, amount,
    };
  });
  return {
    rows, credits, debits, principal, interest, penal, perLoan,
    monthly: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, value })),
  };
};

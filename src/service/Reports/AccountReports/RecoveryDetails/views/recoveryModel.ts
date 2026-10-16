export { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface RecoveryData {
  memberNo: string;
  memberName: string;
  address: string;
  period: string;
  totalDemand: number;
  loanRecoveries: { regularLoan: number; emergencyLoan: number; advanceLoan: number; miscLoan: number };
  depositRecoveries: { recurringDeposit: number; monthlyDeposit: number; compulsoryDeposit: number; shareAmount: number };
  charges: { bankCharges: number; otherCharges: number };
  /** The parts behind the loan recoveries, for the legacy table (emergencyLoan = Loan Against RD, advanceLoan = Emergency Loan). */
  loanOutstanding?: { regularLoan: number; emergencyLoan: number; advanceLoan: number };
  loanPrincipal?: { regularLoan: number; emergencyLoan: number; advanceLoan: number; miscLoan: number };
  loanInterest?: { regularLoan: number; emergencyLoan: number; advanceLoan: number; miscLoan: number };
  rdBalance?: number;
}

export interface Line { key: string; label: string; value: number }

export interface RecoveryDerived {
  loans: Line[];
  deposits: Line[];
  charges: Line[];
  loansTotal: number;
  depositsTotal: number;
  chargesTotal: number;
  /** Sum of the three groups; compared with the stated total demand. */
  groupsTotal: number;
  difference: number;
  matches: boolean;
}

export const deriveRecovery = (d: RecoveryData): RecoveryDerived => {
  const loans: Line[] = [
    { key: 'rln', label: 'Regular Loan (RLN)', value: d.loanRecoveries.regularLoan },
    { key: 'eln', label: 'Loan Against RD (ELN)', value: d.loanRecoveries.emergencyLoan },
    { key: 'aln', label: 'Emergency Loan (ALN)', value: d.loanRecoveries.advanceLoan },
    { key: 'misc', label: 'Misc. Loan', value: d.loanRecoveries.miscLoan },
  ];
  const deposits: Line[] = [
    { key: 'rd', label: 'Recurring Dep (RD)', value: d.depositRecoveries.recurringDeposit },
    { key: 'md', label: 'Monthly Dep (MD)', value: d.depositRecoveries.monthlyDeposit },
    { key: 'cd', label: 'Compulsory Dep (CD)', value: d.depositRecoveries.compulsoryDeposit },
    { key: 'shr', label: 'Share Amount', value: d.depositRecoveries.shareAmount },
  ];
  const charges: Line[] = [
    { key: 'bank', label: 'Bank Charges', value: d.charges.bankCharges },
    { key: 'other', label: 'Other Charges', value: d.charges.otherCharges },
  ];
  const sum = (l: Line[]) => l.reduce((s, x) => s + (x.value || 0), 0);
  const groupsTotal = sum(loans) + sum(deposits) + sum(charges);
  const difference = Math.round((groupsTotal - d.totalDemand) * 100) / 100;
  return {
    loans, deposits, charges,
    loansTotal: sum(loans), depositsTotal: sum(deposits), chargesTotal: sum(charges),
    groupsTotal, difference, matches: Math.abs(difference) < 0.01,
  };
};

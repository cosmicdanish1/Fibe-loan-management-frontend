import React, { useState } from 'react';
import { Banknote, CalendarDays, Gavel, Landmark, PiggyBank, ShieldCheck, Users, Percent, Scale, Award, Handshake } from 'lucide-react';
import FormCalc, { SectionDef } from '../components/FormCalc';
import type { CalculatorRules } from '../lib/types';
import { SB_FEATURE_ENABLED } from '../../../../config/menuActions';

type TabProps = { rules: CalculatorRules | null };

const LOAN_TYPES = [{ value: 'RLN', label: 'Regular' }, { value: 'ALN', label: 'Emergency' }, { value: 'ELN', label: 'Against RD' }];
const YES_NO = [{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }];

/** Chips on top that switch between several FormCalc calculators of one tab. */
const SubTabs: React.FC<{ items: Array<{ id: string; label: string; node: React.ReactNode }> }> = ({ items }) => {
  const [id, setId] = useState(items[0]!.id);
  const cur = items.find((i) => i.id === id) ?? items[0]!;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="aw-chips" role="tablist" style={{ padding: '8px var(--aw-pad)' }}>
        {items.map((i) => (
          <button key={i.id} type="button" role="tab" aria-selected={id === i.id} aria-checked={id === i.id} className="aw-chip" onClick={() => setId(i.id)}>{i.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0 }} key={cur.id}>{cur.node}</div>
    </div>
  );
};

const ico = (C: React.ComponentType<{ size?: number }>) => <C size={14} />;

// ── Penalty ──────────────────────────────────────────────────────────────
const penaltySections: SectionDef[] = [
  { title: 'Installment', icon: ico(Gavel), fields: [
    { type: 'select', key: 'loanType', label: 'Loan type (fills rate, grace, fee)', options: LOAN_TYPES, def: 'RLN' },
    { type: 'number', key: 'principalDue', label: 'Unpaid principal of the installment (₹)', def: '7500', required: true },
    { type: 'date', key: 'dueMonthDate', label: 'Any date in the due month', hint: 'The due date is the grace day of that month.', required: true },
    { type: 'date', key: 'asOfDate', label: 'Calculate as on', required: true },
    { type: 'select', key: 'source', label: 'Money comes from', options: [{ value: 'CASH', label: 'Cash' }, { value: 'DEMAND', label: 'Demand (payroll)' }], def: 'CASH' },
  ] },
  { title: 'Override rules (optional)', icon: ico(Percent), fields: [
    { type: 'int', key: 'graceDay', label: 'Grace day of the month', hint: 'Empty = Business Rules' },
    { type: 'number', key: 'penalRate', label: 'Penalty rate (% per year)', hint: 'Empty = Business Rules' },
    { type: 'number', key: 'smPct', label: 'Same-month fee percent' },
    { type: 'number', key: 'smDiv', label: 'Same-month fee divisor' },
  ] },
];
export const PenaltyTab: React.FC<TabProps> = () => <FormCalc kind="penalty" title="Penalty" sections={penaltySections} waiting="Enter the unpaid principal and the dates to see the penalty." />;

// ── Deposits ─────────────────────────────────────────────────────────────
const sbSections: SectionDef[] = [
  { title: 'Account and period', icon: ico(PiggyBank), fields: [
    { type: 'number', key: 'openingBalance', label: 'Opening balance (₹)', def: '50000', required: true },
    { type: 'number', key: 'annualRate', label: 'Interest rate (% per year)', def: '4', required: true },
    { type: 'date', key: 'fromDate', label: 'From date', required: true },
    { type: 'date', key: 'toDate', label: 'To date (included)', required: true },
  ] },
  { title: 'Deposits and withdrawals', icon: ico(Banknote), fields: [
    { type: 'rows', key: 'transactions', label: 'Dated transactions', hint: 'A transaction counts on its own day.', max: 60,
      columns: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'type', label: 'Type', type: 'select', options: [{ value: 'CR', label: 'Deposit' }, { value: 'DR', label: 'Withdraw' }] }, { key: 'amount', label: 'Amount', type: 'number' }] },
  ] },
];
const fdSections: SectionDef[] = [
  { title: 'Fixed deposit', icon: ico(Landmark), fields: [
    { type: 'number', key: 'principal', label: 'FD amount (₹)', def: '100000', required: true },
    { type: 'number', key: 'annualRate', label: 'Interest rate (% per year)', def: '8', required: true },
    { type: 'date', key: 'depositDate', label: 'Deposit date', required: true },
    { type: 'date', key: 'calcDate', label: 'Calculate up to', required: true },
    { type: 'number', key: 'alreadyPaid', label: 'Interest already paid (₹)', hint: 'Optional' },
  ] },
];
const rdSections: SectionDef[] = [
  { title: 'Recurring deposit', icon: ico(CalendarDays), fields: [
    { type: 'number', key: 'monthlyAmount', label: 'Monthly RD amount (₹)', def: '1000', required: true },
    { type: 'number', key: 'annualRate', label: 'Interest rate (% per year)', hint: 'Empty = Business Rules RD rate' },
    { type: 'date', key: 'fyStartDate', label: 'Financial year start (1 April)', def: `${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-04-01`, required: true },
    { type: 'select', key: 'fullInterestEligible', label: 'Eligible for full interest', options: YES_NO, def: 'YES' },
  ] },
  { title: 'Installments (optional)', icon: ico(CalendarDays), fields: [
    { type: 'rows', key: 'installments', label: 'Leave empty = all 12 paid on time', hint: 'Due month as YYYY-MM. A late installment needs its paid date.', max: 12,
      columns: [{ key: 'dueMonth', label: 'YYYY-MM', type: 'text' }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'ON_TIME', label: 'On time' }, { value: 'LATE', label: 'Late' }, { value: 'UNPAID', label: 'Unpaid' }] }, { key: 'paidDate', label: 'Paid date', type: 'date' }] },
  ] },
  { title: 'Opening balance events (optional)', icon: ico(Banknote), fields: [
    { type: 'rows', key: 'balanceEvents', label: 'Balance after each event', max: 30,
      columns: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'type', label: 'Type', type: 'select', options: [{ value: 'OPENING', label: 'Opening' }, { value: 'WITHDRAWAL', label: 'Withdrawal' }, { value: 'LOAN_ADDITION', label: 'Loan addition' }] }, { key: 'balance', label: 'Balance after', type: 'number' }] },
  ] },
];
export const DepositsTab: React.FC<TabProps> = () => (
  <SubTabs items={[
    ...(SB_FEATURE_ENABLED ? [{ id: 'sb', label: 'Savings (SB)', node: <FormCalc kind="sb-interest" title="Savings Bank interest" sections={sbSections} waiting="Enter the balance, rate and period." /> }] : []),
    { id: 'fd', label: 'Fixed Deposit (FD)', node: <FormCalc kind="fd-interest" title="Fixed Deposit interest" sections={fdSections} waiting="Enter the FD amount, rate and dates." /> },
    { id: 'rd', label: 'RD/CD', node: <FormCalc kind="rd-interest" title="RD financial-year interest" sections={rdSections} waiting="Enter the monthly amount and the financial year." /> },
  ]} />
);

// ── Member money ─────────────────────────────────────────────────────────
const eligSections: SectionDef[] = [
  { title: 'Loan wanted', icon: ico(Scale), fields: [
    { type: 'select', key: 'loanType', label: 'Loan type', options: LOAN_TYPES, def: 'RLN' },
    { type: 'number', key: 'loanAmount', label: 'Loan amount (₹)', def: '300000', required: true },
    { type: 'number', key: 'existingOutstanding', label: 'Existing outstanding of this type (₹)', def: '0' },
  ] },
  { title: 'Member holdings', icon: ico(PiggyBank), fields: [
    { type: 'number', key: 'currentRd', label: 'RD balance (₹)', def: '0', hint: 'For Loan Against RD: total RD' },
    { type: 'number', key: 'currentShare', label: 'Share value (₹)', def: '0' },
    { type: 'number', key: 'lockedRd', label: 'RD locked by other loans (₹)', hint: 'Loan Against RD only' },
  ] },
];
const elnSections: SectionDef[] = [
  { title: 'Loan Against RD', icon: ico(PiggyBank), fields: [
    { type: 'number', key: 'totalRd', label: 'Total RD (₹)', def: '100000', required: true },
    { type: 'number', key: 'lockedRd', label: 'Already locked for other loans (₹)', def: '0' },
    { type: 'number', key: 'loanAmount', label: 'Amount wanted (₹)', hint: 'Optional: to check it is allowed' },
  ] },
];
const consSections: SectionDef[] = [
  { title: 'Loans', icon: ico(Handshake), fields: [
    { type: 'select', key: 'loanType', label: 'Loan type', options: LOAN_TYPES.slice(0, 2), def: 'RLN' },
    { type: 'number', key: 'existingBalance', label: 'Existing loan balance (₹)', def: '100000', required: true },
    { type: 'number', key: 'sanctionedAmount', label: 'New sanctioned amount (₹)', def: '200000', required: true },
    { type: 'number', key: 'oldClosureInterest', label: 'Closure interest of the old loan (₹)', def: '0', hint: 'NR + AP + penalty from the Closure tab' },
  ] },
  { title: 'New agreement', icon: ico(Percent), fields: [
    { type: 'number', key: 'annualRate', label: 'Interest rate (% per year)', def: '12', required: true },
    { type: 'int', key: 'installments', label: 'Installments (months)', def: '40', required: true },
    { type: 'date', key: 'applicationDate', label: 'Application date', required: true },
  ] },
  { title: 'Member holdings', icon: ico(PiggyBank), fields: [
    { type: 'number', key: 'currentRd', label: 'RD balance (₹)', def: '0', hint: 'A negative RD (group insurance) is cleared first' },
    { type: 'number', key: 'currentShare', label: 'Share value (₹)', def: '0' },
  ] },
];
const reagSections: SectionDef[] = [
  { title: 'Old loan position', icon: ico(Handshake), fields: [
    { type: 'number', key: 'outstandingPrincipal', label: 'Outstanding principal (₹)', def: '277500', required: true },
    { type: 'number', key: 'apInterest', label: 'AP interest carried into the new loan (₹)', def: '0' },
    { type: 'number', key: 'nrInterest', label: 'NR interest collected now (₹)', def: '0' },
    { type: 'number', key: 'penalty', label: 'Penalty collected now (₹)', def: '0' },
  ] },
  { title: 'New agreement', icon: ico(Percent), fields: [
    { type: 'number', key: 'annualRate', label: 'Interest rate (% per year)', def: '12', required: true },
    { type: 'int', key: 'installments', label: 'Installments (months)', def: '30', required: true },
    { type: 'date', key: 'applicationDate', label: 'Application date', required: true },
  ] },
];
export const MemberMoneyTab: React.FC<TabProps> = () => (
  <SubTabs items={[
    { id: 'elig', label: 'Eligibility and net payout', node: <FormCalc kind="eligibility" title="Eligibility and net payout" sections={eligSections} waiting="Enter the loan and the member's RD / Share." /> },
    { id: 'eln', label: 'Loan Against RD maximum', node: <FormCalc kind="loan-against-rd" title="Loan Against RD maximum" sections={elnSections} waiting="Enter the member's total RD." /> },
    { id: 'cons', label: 'Consolidation payout', node: <FormCalc kind="consolidation" title="Consolidation payout" sections={consSections} waiting="Enter the existing balance and the new sanction." /> },
    { id: 'reag', label: 'Re-agreement', node: <FormCalc kind="reagreement" title="Re-agreement quote" sections={reagSections} waiting="Enter the outstanding principal and the new terms." /> },
  ]} />
);

// ── Funds: dividend, insurance, Saakh ────────────────────────────────────
const MONTH_ROWS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map((m) => ({ month: m, balance: '' }));
const divSections: SectionDef[] = [
  { title: 'Dividend', icon: ico(Percent), fields: [
    { type: 'number', key: 'dividendRate', label: 'Dividend rate (%)', def: '10', required: true },
    { type: 'rows', key: 'balances', label: 'Share balance at each month end', hint: 'Fill every month the member held shares.', max: 12, defRows: MONTH_ROWS,
      columns: [{ key: 'month', label: 'Month', type: 'text' }, { key: 'balance', label: 'Share balance', type: 'number' }] },
  ] },
];
const insSections: SectionDef[] = [
  { title: 'Group insurance', icon: ico(ShieldCheck), fields: [
    { type: 'number', key: 'lumpSum', label: 'Lump sum for the year (₹)', def: '120000', required: true },
    { type: 'int', key: 'activeMembers', label: 'Eligible active members', def: '500', required: true },
    { type: 'date', key: 'fyStartDate', label: 'Financial year start (1 April)', def: `${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-04-01`, required: true },
    { type: 'date', key: 'joinDate', label: 'Member joining date (optional)', def: '', hint: 'Empty = full year' },
    { type: 'number', key: 'rdBalance', label: 'Member RD balance (₹)', hint: 'Optional: to see the RD after deduction' },
  ] },
];
const saakhSections: SectionDef[] = [
  { title: 'Loans', icon: ico(Award), fields: [
    { type: 'select', key: 'hasLoanHistory', label: 'Has loan history', options: YES_NO, def: 'YES' },
    { type: 'number', key: 'avgRepaidPct', label: 'Average repaid % over all loans', def: '90' },
    { type: 'int', key: 'activeLoans', label: 'Active loans', def: '1' },
    { type: 'int', key: 'loansWithPenalty', label: 'Active loans with a penalty rate', def: '0' },
    { type: 'number', key: 'suspenseBalance', label: 'Suspense balance (₹)', def: '0' },
  ] },
  { title: 'Member', icon: ico(Users), fields: [
    { type: 'number', key: 'shareCapital', label: 'Share capital (₹)', def: '0' },
    { type: 'number', key: 'cdBalance', label: 'CD / RD balance (₹)', def: '0' },
    { type: 'int', key: 'tenureYears', label: 'Years as a member', def: '5' },
    { type: 'int', key: 'guarantorFor', label: 'Loans guaranteed', def: '0' },
    { type: 'select', key: 'guaranteedLoansClear', label: 'Guaranteed loans all cleared', options: YES_NO, def: 'YES' },
  ] },
];
export const FundsTab: React.FC<TabProps> = () => (
  <SubTabs items={[
    { id: 'div', label: 'Dividend', node: <FormCalc kind="dividend" title="Dividend" sections={divSections} waiting="Enter the rate and the month-end share balances." /> },
    { id: 'ins', label: 'Group insurance', node: <FormCalc kind="insurance" title="Group insurance share" sections={insSections} waiting="Enter the lump sum and the number of members." /> },
    { id: 'saakh', label: 'Saakh score', node: <FormCalc kind="saakh" title="Saakh score" sections={saakhSections} waiting="Enter the member's figures." /> },
  ]} />
);

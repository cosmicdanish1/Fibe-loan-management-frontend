import React from 'react';
import FlowDiagram from './FlowDiagram';
import type { Slide } from './SlideDeck';
import { canUseAny } from '../roleAccess';

// Same list the dashboard's Keyboard Shortcuts card shows (Dashboard.tsx SHORTCUTS).
const SHORTCUTS = [
  { label: 'New Member', keys: ['Ctrl', 'N'] },
  { label: 'Save record', keys: ['Ctrl', 'S'] },
  { label: 'Find / Search', keys: ['Ctrl', 'F'] },
  { label: 'Delete record', keys: ['Ctrl', 'D'] },
  { label: 'Refresh data', keys: ['F5'] },
  { label: 'Print', keys: ['Ctrl', 'P'] },
  { label: 'Dashboard', keys: ['Alt', 'H'] },
  { label: 'Exit form', keys: ['Esc'] },
];

/** The flows that cannot be toured on screen, drawn as animated diagrams. */
export const HOW_IT_WORKS_SLIDES: Slide[] = [
  {
    id: 'big-picture',
    title: 'The big picture',
    subtitle: 'How a day of work flows through the system',
    body: (
      <FlowDiagram label="Set up, enter, pass, close the day, report" nodes={[
        { title: 'Set up', lines: ['Members, offices,', 'accounts and heads'], where: 'Masters' },
        { title: 'Enter', lines: ['Loans, deposits,', 'vouchers, recoveries'], where: 'Transaction' },
        { title: 'Pass', lines: ['A second person approves', 'entries that need it'], where: 'Pass Transactions' },
        { title: 'Close the day', lines: ['Checks, backup and the', 'next working date'], where: 'Administration › DayEnd' },
        { title: 'Report', lines: ['Daily, monthly and', 'yearly reports'], where: 'Reports' },
      ]} />
    ),
  },
  {
    id: 'loan',
    enabled: (u) => canUseAny(u, 'LOAN_APP', 'LOAN_PAYMENT', 'LOAN_REPAYMENT', 'LOAN_EARLY_CLOSURE'),
    title: 'Life of a loan',
    subtitle: 'From application to closure',
    body: (
      <FlowDiagram label="Loan lifecycle" nodes={[
        { title: 'Apply', lines: ['Limits and eligibility', 'are checked'], where: 'Administration › Loan' },
        { title: 'Sanction', lines: ['Terms are agreed and a', 'fixed monthly EMI set'], where: 'From Loan Payment' },
        { title: 'Pay out', lines: ['The amount is paid and', 'the schedule is created'], where: 'Transaction › Loan Payment' },
        { title: 'Repay', lines: ['Monthly through the', 'demand list, or by hand'], where: 'Loan Repayment' },
        { title: 'Close', lines: ['Pay it off early, or', 'restructure with a new', 'agreement'], where: 'Early Closure / Re-agreement' },
      ]} />
    ),
    note: 'An instalment paid after its grace day carries a penalty, so recovery dates matter.',
  },
  {
    id: 'demand',
    enabled: (u) => canUseAny(u, 'GENERATE', 'IMPORT_DEMAND_LIST', 'UPDATION_LEDGER_POSTING', 'PRINT_MEMBERS_DEMAND_LIST'),
    title: 'Demand and recovery',
    subtitle: 'How the monthly dues are collected',
    body: (
      <FlowDiagram label="Demand and recovery" nodes={[
        { title: 'Generate', lines: ['Work out what each member', 'owes for the month'], where: 'Demand / Recovery List' },
        { title: 'Print list', lines: ['Send each office its', 'members demand list'], where: 'Print Members Demand List' },
        { title: 'Import', lines: ['Load what was actually', 'recovered (Excel / CSV)'], where: 'Import Demand List' },
        { title: 'Post', lines: ['Recoveries are posted', 'to member ledgers'], where: 'Updation / Ledger Posting' },
        { title: 'Fix shortfalls', lines: ['Adjust where an office', 'recovered less'], where: 'Modify Short Recovery' },
      ]} />
    ),
  },
  {
    id: 'rd',
    enabled: (u) => canUseAny(u, 'RD_MEMBER_SETUP', 'RD_WITHDRAWAL', 'RD_REPAYMENT'),
    title: 'Recurring deposit (RD)',
    subtitle: 'Saving a little every month',
    body: (
      <FlowDiagram label="Recurring deposit" nodes={[
        { title: 'Set up', lines: ['Open the RD with a', 'monthly amount'], where: 'Masters › RD Member Setup' },
        { title: 'Instalments', lines: ['Collected each month', 'with the demand'], where: 'Demand / Recovery List' },
        { title: 'Interest', lines: ['Interest is calculated', 'and posted'], where: 'Interest Calculation' },
        { title: 'Withdraw', lines: ['Take money out, keeping', 'the minimum balance'], where: 'Masters › RD Withdrawal' },
        { title: 'Borrow', lines: ['A loan against RD locks', 'part of the balance'], where: 'Loan Against RD' },
      ]} />
    ),
    note: 'Fixed deposits are not covered here yet.',
  },
  {
    id: 'day-end',
    enabled: (u) => canUseAny(u, 'DAY_END'),
    title: 'Closing the day',
    subtitle: 'What Day-End does when you press Close Day',
    body: (
      <FlowDiagram label="Day-End" columns={5} nodes={[
        { title: 'Check', lines: ['Loan and deposit data', 'are sanity-checked'] },
        { title: 'Report', lines: ['A cash-book summary', 'is saved to disk'] },
        { title: 'Back up', lines: ['A full database backup', 'is taken'] },
        { title: 'Tidy up', lines: ['Old logs are cleared', 'by the retention rule'] },
        { title: 'Next day', lines: ['Today closes and the', 'next working date opens'], where: 'Administration › DayEnd' },
      ]} />
    ),
    note: 'The working date only moves when someone closes the day, so a busy day can safely run past midnight.',
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    subtitle: 'Faster than the mouse',
    body: (
      <div className="ob-kbd-grid">
        {SHORTCUTS.map((s) => (
          <div key={s.label} className="ob-kbd-row">
            <span>{s.label}</span>
            <span className="ob-kbd-keys">
              {s.keys.map((k, i) => (
                <React.Fragment key={k}>{i > 0 && <em>+</em>}<kbd>{k}</kbd></React.Fragment>
              ))}
            </span>
          </div>
        ))}
      </div>
    ),
    note: 'Some shortcuts work only inside an open form.',
  },
];

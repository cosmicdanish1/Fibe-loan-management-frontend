import React from 'react';
import FlowDiagram from './FlowDiagram';
import type { Slide } from './SlideDeck';
import { canUseAny } from '../roleAccess';
import { tLabel } from '../../../i18n';

// Same list the dashboard's Keyboard Shortcuts card shows (Dashboard.tsx SHORTCUTS).
const SHORTCUTS = [
  { label: tLabel('New Member'), keys: ['Ctrl', 'N'] },
  { label: tLabel('Save record'), keys: ['Ctrl', 'S'] },
  { label: tLabel('Find / Search'), keys: ['Ctrl', 'F'] },
  { label: tLabel('Delete record'), keys: ['Ctrl', 'D'] },
  { label: tLabel('Refresh data'), keys: ['F5'] },
  { label: tLabel('Print'), keys: ['Ctrl', 'P'] },
  { label: tLabel('Dashboard'), keys: ['Alt', 'H'] },
  { label: tLabel('Exit form'), keys: ['Esc'] },
];

/** The flows that cannot be toured on screen, drawn as animated diagrams. */
export const HOW_IT_WORKS_SLIDES: Slide[] = [
  {
    id: 'big-picture',
    title: tLabel('The big picture'),
    subtitle: tLabel('How a day of work flows through the system'),
    body: (
      <FlowDiagram label={tLabel('Set up, enter, pass, close the day, report')} nodes={[
        { title: tLabel('Set up'), lines: ['Members, offices,', 'accounts and heads'], where: 'Masters' },
        { title: tLabel('Enter'), lines: ['Loans, deposits,', 'vouchers, recoveries'], where: 'Transaction' },
        { title: tLabel('Pass'), lines: ['A second person approves', 'entries that need it'], where: 'Pass Transactions' },
        { title: tLabel('Close the day'), lines: ['Checks, backup and the', 'next working date'], where: 'Administration › DayEnd' },
        { title: tLabel('Report'), lines: ['Daily, monthly and', 'yearly reports'], where: 'Reports' },
      ]} />
    ),
  },
  {
    id: 'loan',
    enabled: (u) => canUseAny(u, 'LOAN_APP', 'LOAN_PAYMENT', 'LOAN_REPAYMENT', 'LOAN_EARLY_CLOSURE'),
    title: tLabel('Life of a loan'),
    subtitle: tLabel('From application to closure'),
    body: (
      <FlowDiagram label={tLabel('Loan lifecycle')} nodes={[
        { title: tLabel('Apply'), lines: ['Limits and eligibility', 'are checked'], where: 'Administration › Loan' },
        { title: tLabel('Sanction'), lines: ['Terms are agreed and a', 'fixed monthly EMI set'], where: 'From Loan Payment' },
        { title: tLabel('Pay out'), lines: ['The amount is paid and', 'the schedule is created'], where: 'Transaction › Loan Payment' },
        { title: tLabel('Repay'), lines: ['Monthly through the', 'demand list, or by hand'], where: 'Loan Repayment' },
        { title: tLabel('Close'), lines: ['Pay it off early, or', 'restructure with a new', 'agreement'], where: 'Early Closure / Re-agreement' },
      ]} />
    ),
    note: 'An instalment paid after its grace day carries a penalty, so recovery dates matter.',
  },
  {
    id: 'demand',
    enabled: (u) => canUseAny(u, 'GENERATE', 'IMPORT_DEMAND_LIST', 'UPDATION_LEDGER_POSTING', 'PRINT_MEMBERS_DEMAND_LIST'),
    title: tLabel('Demand and recovery'),
    subtitle: tLabel('How the monthly dues are collected'),
    body: (
      <FlowDiagram label={tLabel('Demand and recovery')} nodes={[
        { title: tLabel('Generate'), lines: ['Work out what each member', 'owes for the month'], where: 'Demand / Recovery List' },
        { title: tLabel('Print list'), lines: ['Send each office its', 'members demand list'], where: 'Print Members Demand List' },
        { title: tLabel('Import'), lines: ['Load what was actually', 'recovered (Excel / CSV)'], where: 'Import Demand List' },
        { title: tLabel('Post'), lines: ['Recoveries are posted', 'to member ledgers'], where: 'Updation / Ledger Posting' },
        { title: tLabel('Fix shortfalls'), lines: ['Adjust where an office', 'recovered less'], where: 'Modify Short Recovery' },
      ]} />
    ),
  },
  {
    id: 'rd',
    enabled: (u) => canUseAny(u, 'RD_MEMBER_SETUP', 'RD_WITHDRAWAL', 'RD_REPAYMENT'),
    title: tLabel('Recurring deposit (RD)'),
    subtitle: tLabel('Saving a little every month'),
    body: (
      <FlowDiagram label={tLabel('Recurring deposit')} nodes={[
        { title: tLabel('Set up'), lines: ['Open the RD with a', 'monthly amount'], where: 'Masters › RD Member Setup' },
        { title: tLabel('Instalments'), lines: ['Collected each month', 'with the demand'], where: 'Demand / Recovery List' },
        { title: tLabel('Interest'), lines: ['Interest is calculated', 'and posted'], where: 'Interest Calculation' },
        { title: tLabel('Withdraw'), lines: ['Take money out, keeping', 'the minimum balance'], where: 'Masters › RD Withdrawal' },
        { title: tLabel('Borrow'), lines: ['A loan against RD locks', 'part of the balance'], where: 'Loan Against RD' },
      ]} />
    ),
    note: 'Fixed deposits are not covered here yet.',
  },
  {
    id: 'day-end',
    enabled: (u) => canUseAny(u, 'DAY_END'),
    title: tLabel('Closing the day'),
    subtitle: tLabel('What Day-End does when you press Close Day'),
    body: (
      <FlowDiagram label={tLabel('Day-End')} columns={5} nodes={[
        { title: tLabel('Check'), lines: ['Loan and deposit data', 'are sanity-checked'] },
        { title: tLabel('Report'), lines: ['A cash-book summary', 'is saved to disk'] },
        { title: tLabel('Back up'), lines: ['A full database backup', 'is taken'] },
        { title: tLabel('Tidy up'), lines: ['Old logs are cleared', 'by the retention rule'] },
        { title: tLabel('Next day'), lines: ['Today closes and the', 'next working date opens'], where: 'Administration › DayEnd' },
      ]} />
    ),
    note: 'The working date only moves when someone closes the day, so a busy day can safely run past midnight.',
  },
  {
    id: 'shortcuts',
    title: tLabel('Keyboard shortcuts'),
    subtitle: tLabel('Faster than the mouse'),
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

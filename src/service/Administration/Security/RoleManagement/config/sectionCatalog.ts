// Groups the flat list of menu rights (as returned by GET /admin/roles/menus,
// keyed off menumaster.menudesc) into the same sections the Navbar uses, so
// the Role Governance grid reads as "Administration / Masters / Transaction /
// Reports / Utility / Help" instead of one undifferentiated 133-item list.
//
// Matched by exact display-name text rather than menuid, since that's what
// the API already exposes here (see useDefaultRights.ts's `description`
// derivation) and keeps this file decoupled from backend id churn. Any real
// menu item whose text isn't in the catalog below still shows up — grouped
// into "Other" — rather than silently disappearing from the matrix.
const SECTION_CATALOG: [string, string[]][] = [
  ['Administration', [
    'Create / Modify Users', 'Configure UserLevel Default Rights', 'Change Password', 'LogOut User',
    'Pass Transactions', 'Updation / Ledger Posting', 'Update After Receipt', 'Update Aftter Receipt',
    'Database BackUp', 'BackUp Database', 'DayEnd', '2 Financial Year Closing', 'Financial Year Closing',
    'Transfer Entries For Closing', 'Financial Year Balance Transfer', '4 P and L Year End Process',
    'P and L Year End Process', 'Modify Business Rules',
    'Signature Scanning',
  ]],
  ['Masters', [
    'Member Master', 'Wing / Office Master', 'Wing / Office List', 'Head Addition / Modification',
    'Head Opening Balance', 'Deposite/Loan Slab', 'Designation Master', 'Cast Category',
    'Certificate Parameter Setting', 'Passbook Parameter Setting', 'Change Member Office',
    'Change Loan Surety', 'Member Balance Transfer', 'Modify Member Balance', 'Modify FD A/c',
    'EMI Chart', 'Saakh Score - Member Health', 'Saakh Score', 'FD/RD/SB Entry', 'Loan Entry',
  ]],
  ['Transaction', [
    'Loan Application', 'Loan Scrutiny / Sanction', 'Loan Payment', 'Loan Repayment', 'Loan Early Closure',
    'New Loan Disbursed', 'FD / Interest Voucher Posting', 'FD Withdrawl / Int. Payment',
    'FD Withdrawal / Int. Payment', 'RD A/c Opening', 'Pass RD A/C', 'Saving A/c Opening',
    'Saving [Receipt -- Payment]', 'Saving Receipt Payment', 'Journal / Transfer Entry',
    'Journal / Transfer Voucher', 'Payment Voucher Creation', 'Voucher Payment', 'Receipt',
    'Fixed Deposit Receipt', 'Dividend Payment', 'Dividend Warrant', 'Interest Calculation',
    'Interest Calculation / Posting', 'Yearly TF Interest', 'Update Saving Intt.',
    'Modify Short Recovery', 'Compulsory Deposit Transaction', 'Demand Print Order',
    'Import Demand List', 'Generate', 'Generate Demand', 'Change Member Office',
    'Print Members Demand List',
  ]],
  ['Reports', [
    '1.1 Cash Book (Receiptwise Rough)', 'Cash Book Receiptwise Rough', '1.2 Cash-Book', 'Cash Book',
    '1.3 Day-Book', 'Day Book', '1.4 Day-Book [CD]', 'Day Book CD', '1.5 Consolidation Of Daily A/c',
    'Consolidation Of Daily A/c', '2. Member Ledger Report', 'Member Ledger Report', '3. General Ledger',
    'General Ledger', '4. Monthly', '4.1 Print Vouchers', '4.1.1 Receipt/Payment Voucher',
    'Receipt/Payment Voucher', '4.1.2. Journal/Transfer Voucher', 'Journal/Transfer Voucher',
    '4.1.1 Wing / Office List', '4.2 Cash Book Monthly', 'Cash Book Monthly', '4.3 Detail Ledger',
    'Detail Ledger', '4.4 Wing Offices', '4.4 Bank Detail Ledger', 'Bank Detail Ledger',
    '4.5 Defaulter List', 'Defaulter List', '5.1 P L / Balance Sheet', 'P&L / Balance Sheet',
    '5.2.1 Voters/Withdrawl List', 'Voters/Withdrawal List', '5.3.1 Dividend Report', 'Dividend Report',
    '5.3.2 Dividend Paid', 'Dividend Paid', '5.3.3 Int. List CD/MD/SHR', 'Interest List CD/MD/SHRt',
    '5.4.1 Define Trial Balance', '5.4.2 Open Trial Balance', '5.4.3 Define BalanceSheet',
    '5.4.4 Open BalanceSheet', '5.5 Label Printing', '5.5 Member Loan Detail', 'Member Loan Detail',
    '5.6 Share Warrent Printing', 'Share Warrant Printing', '6. Member Detail Ledger',
    'Member Detail Ledger', '7. Jotting Report', '8.1 Fixed Deposit', 'Fixed Deposit Certificate',
    '8.2 Share', 'Share Certificate', '9.1 Saving Statement', 'Saving Statement', '9.2 RD Statement',
    'RD Statement', '9.3 FD Statement', 'FD Statement', '9.4 Member Statement', 'Member Statement',
    '10. Surety Register', 'Surety Register', '11. Deposit Due Date Register', 'Deposit Due Date Register',
    'Member Ledger', 'Member Balance', 'Account Balance', 'Interest Receivable/Received Statement',
    'Loan Account Statement', 'Member Loan Ledger', 'Annual Member Statement', 'Yearly Member Statement',
    'Loan Contributions Register', 'Recovery Details', 'Recurring Details', 'Lien Account Information',
    'Account Closing Register', 'For RD A/c', 'Premature Info For RD A/c', 'For SB A/c',
    'Premature Info For SB A/c',
  ]],
  ['Utility', [
    'Calculator', 'Find', 'Pass Book Printing', 'New Share Certificate', 'Interest Certificate',
    'Loan Nil Certificate', 'Share Certificate Printing', 'Fixed Deposit Certificate Printing',
    'Communication Hub',
  ]],
  ['Help', ['About', 'Contents']],
];

export const SECTION_ORDER = [...SECTION_CATALOG.map(([name]) => name), 'Other'];

const NAME_TO_SECTION: Map<string, string> = new Map(
  SECTION_CATALOG.flatMap(([name, items]) => items.map((item) => [item.trim().toLowerCase(), name] as const)),
);

export function sectionForDescription(description: string): string {
  return NAME_TO_SECTION.get(description.trim().toLowerCase()) || 'Other';
}

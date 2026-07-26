// Shared config for configurable Quick Actions on the Dashboard.
// Both Dashboard and SettingsPage import from here.

export interface QuickActionDef {
  id: string;
  label: string;
  route: string;
  iconName: string;
  /** Tailwind classes for the icon wrapper in light mode */
  colorCls: string;
  category: 'Masters' | 'Transactions' | 'Demand & Recovery' | 'Administration' | 'Utility' | 'Certificates';
}

export const ALL_QUICK_ACTION_DEFS: QuickActionDef[] = [
  // ── Masters ────────────────────────────────────────────────────────────────
  { id: 'new-member',        label: 'New Member',        route: '/masters/member',                              iconName: 'Users',          colorCls: 'bg-indigo-50 text-indigo-600 border-indigo-100',   category: 'Masters' },
  { id: 'new-rd',            label: 'New RD A/c',        route: '/masters/rd-account/opening',                  iconName: 'BookOpen',       colorCls: 'bg-blue-50 text-blue-600 border-blue-100',         category: 'Masters' },
  { id: 'pass-rd',           label: 'Pass RD A/c',       route: '/masters/rd-account/pass',                     iconName: 'BookMarked',     colorCls: 'bg-sky-50 text-sky-600 border-sky-100',            category: 'Masters' },
  { id: 'new-sb',            label: 'New SB A/c',        route: '/masters/saving-account-opening',              iconName: 'PiggyBank',      colorCls: 'bg-emerald-50 text-emerald-600 border-emerald-100',category: 'Masters' },
  { id: 'wing-office',       label: 'Wing / Office',     route: '/masters/wing-office',                         iconName: 'Building2',      colorCls: 'bg-cyan-50 text-cyan-600 border-cyan-100',         category: 'Masters' },
  { id: 'modify-fd',         label: 'Modify FD A/c',     route: '/masters/modify-fd-account',                   iconName: 'FilePen',        colorCls: 'bg-violet-50 text-violet-600 border-violet-100',   category: 'Masters' },
  { id: 'modify-balance',    label: 'Member Balance',    route: '/masters/modify-member-balance',               iconName: 'Scale',          colorCls: 'bg-orange-50 text-orange-600 border-orange-100',   category: 'Masters' },
  { id: 'cast-category',    label: 'Cast Category',     route: '/masters/cast-category',                       iconName: 'Tag',            colorCls: 'bg-rose-50 text-rose-600 border-rose-100',         category: 'Masters' },
  { id: 'designation',       label: 'Designation',       route: '/masters/designation',                         iconName: 'Briefcase',      colorCls: 'bg-amber-50 text-amber-600 border-amber-100',      category: 'Masters' },

  // ── Transactions ───────────────────────────────────────────────────────────
  { id: 'loan-application',  label: 'Loan Application',  route: '/loan-application',                            iconName: 'FileText',       colorCls: 'bg-indigo-50 text-indigo-600 border-indigo-100',   category: 'Transactions' },
  { id: 'change-surety',     label: 'Change Surety',     route: '/change-loan-surety',                          iconName: 'ArrowLeftRight', colorCls: 'bg-violet-50 text-violet-600 border-violet-100',   category: 'Transactions' },
  { id: 'saving-voucher',    label: 'Saving Voucher',    route: '/transaction/saving',                          iconName: 'Wallet',         colorCls: 'bg-emerald-50 text-emerald-600 border-emerald-100',category: 'Transactions' },
  { id: 'journal-transfer',  label: 'Journal Transfer',  route: '/transaction/journal-transfer',                iconName: 'ArrowRightLeft', colorCls: 'bg-blue-50 text-blue-600 border-blue-100',         category: 'Transactions' },
  { id: 'loan-payment',      label: 'Loan Payment',      route: '/transaction/loan-payment',                    iconName: 'CreditCard',     colorCls: 'bg-rose-50 text-rose-600 border-rose-100',         category: 'Transactions' },
  { id: 'loan-repayment',    label: 'Loan Repayment',    route: '/transaction/loan-repayment',                  iconName: 'RotateCcw',      colorCls: 'bg-orange-50 text-orange-600 border-orange-100',   category: 'Transactions' },
  { id: 'cd-transaction',    label: 'CD Transaction',    route: '/transaction/compulsory-deposit',              iconName: 'Layers',         colorCls: 'bg-teal-50 text-teal-600 border-teal-100',         category: 'Transactions' },
  { id: 'pass-transactions', label: 'Pass Transactions', route: '/transaction/pass-transactions',               iconName: 'CheckSquare',    colorCls: 'bg-slate-100 text-slate-600 border-slate-200',     category: 'Transactions' },
  { id: 'payment-voucher',   label: 'Payment Voucher',   route: '/transaction/receipt-payment/payment-voucher-creation', iconName: 'Receipt', colorCls: 'bg-green-50 text-green-600 border-green-100', category: 'Transactions' },
  { id: 'receipt',           label: 'Receipt',           route: '/transaction/receipt-payment/receipt',         iconName: 'ReceiptText',    colorCls: 'bg-lime-50 text-lime-600 border-lime-100',         category: 'Transactions' },
  { id: 'dividend',          label: 'Dividend Payment',  route: '/transaction/receipt-payment/dividend-payment',iconName: 'DollarSign',     colorCls: 'bg-yellow-50 text-yellow-600 border-yellow-100',   category: 'Transactions' },
  { id: 'fd-receipt',        label: 'FD Receipt',        route: '/transaction/fixed-deposit/receipt',           iconName: 'Landmark',       colorCls: 'bg-indigo-50 text-indigo-600 border-indigo-100',   category: 'Transactions' },

  // ── Demand & Recovery ─────────────────────────────────────────────────────
  { id: 'record-recovery',   label: 'Record Recovery',   route: '/transaction/demand-recovery/updation-ledger-posting',    iconName: 'ArrowDownLeft', colorCls: 'bg-amber-50 text-amber-600 border-amber-100',  category: 'Demand & Recovery' },
  { id: 'print-demand',      label: 'Print Demand',      route: '/transaction/demand-recovery/print-members-demand-list',   iconName: 'Printer',       colorCls: 'bg-rose-50 text-rose-600 border-rose-100',     category: 'Demand & Recovery' },
  { id: 'import-demand',     label: 'Import Demand',     route: '/transaction/demand-recovery/import-demand-list',          iconName: 'FileDown',      colorCls: 'bg-violet-50 text-violet-600 border-violet-100',category: 'Demand & Recovery' },
  { id: 'generate-demand',   label: 'Generate Demand',   route: '/transaction/demand-recovery/generate',                    iconName: 'Zap',           colorCls: 'bg-orange-50 text-orange-600 border-orange-100',category: 'Demand & Recovery' },
  { id: 'modify-recovery',   label: 'Modify Recovery',   route: '/transaction/demand-recovery/modify-short-recovery',       iconName: 'PenLine',       colorCls: 'bg-slate-100 text-slate-600 border-slate-200', category: 'Demand & Recovery' },

  // ── Administration ────────────────────────────────────────────────────────
  { id: 'day-end',           label: 'Day End',           route: '/day-end',                                     iconName: 'Moon',           colorCls: 'bg-slate-100 text-slate-600 border-slate-200',     category: 'Administration' },
  { id: 'interest-calc',     label: 'Interest Calc.',    route: '/interest-calculation',                        iconName: 'Calculator',     colorCls: 'bg-indigo-50 text-indigo-600 border-indigo-100',   category: 'Administration' },
  { id: 'interest-posting',  label: 'Interest Posting',  route: '/interest-calculation-posting',                iconName: 'TrendingUp',     colorCls: 'bg-emerald-50 text-emerald-600 border-emerald-100',category: 'Administration' },
  { id: 'balance-transfer',  label: 'Balance Transfer',  route: '/financial-year/balance-transfer',             iconName: 'ArrowLeftRight', colorCls: 'bg-blue-50 text-blue-600 border-blue-100',         category: 'Administration' },
  { id: 'saakh-score',       label: 'Saakh Score',       route: '/saakh-score',                                 iconName: 'Star',           colorCls: 'bg-amber-50 text-amber-600 border-amber-100',      category: 'Administration' },
  { id: 'business-rules',    label: 'Business Rules',    route: '/modify-business-rules',                       iconName: 'Settings2',      colorCls: 'bg-violet-50 text-violet-600 border-violet-100',   category: 'Administration' },
  { id: 'demand-print-order',label: 'Print Order',       route: '/demand-print-order',                          iconName: 'ListOrdered',    colorCls: 'bg-sky-50 text-sky-600 border-sky-100',            category: 'Administration' },
  { id: 'user-management',   label: 'Users',             route: '/user-management',                             iconName: 'ShieldCheck',    colorCls: 'bg-rose-50 text-rose-600 border-rose-100',         category: 'Administration' },
  { id: 'change-password',   label: 'Change Password',   route: '/change-password',                             iconName: 'Lock',           colorCls: 'bg-slate-100 text-slate-600 border-slate-200',     category: 'Administration' },

  // ── Utility ───────────────────────────────────────────────────────────────
  { id: 'db-backup',         label: 'DB Backup',         route: '/utility/database-backup',                     iconName: 'Database',       colorCls: 'bg-slate-100 text-slate-600 border-slate-200',     category: 'Utility' },
  { id: 'calculator',        label: 'Calculator',        route: '/utility/calculator',                          iconName: 'Hash',           colorCls: 'bg-blue-50 text-blue-600 border-blue-100',         category: 'Utility' },
  { id: 'emi-chart',         label: 'EMI Chart',         route: '/utility/emi-chart',                           iconName: 'BarChart2',      colorCls: 'bg-indigo-50 text-indigo-600 border-indigo-100',   category: 'Utility' },
  { id: 'member-balance',    label: 'Member Balance',    route: '/utility/member-balance',                      iconName: 'Banknote',       colorCls: 'bg-emerald-50 text-emerald-600 border-emerald-100',category: 'Utility' },
  { id: 'comm-center',       label: 'Comm. Center',      route: '/utility/communication-center',                iconName: 'MessageSquare',  colorCls: 'bg-violet-50 text-violet-600 border-violet-100',   category: 'Utility' },

  // ── Certificates ──────────────────────────────────────────────────────────
  { id: 'fd-printing',       label: 'FD Certificate',    route: '/certificate/fd-printing',                     iconName: 'Award',          colorCls: 'bg-amber-50 text-amber-600 border-amber-100',      category: 'Certificates' },
  { id: 'share-printing',    label: 'Share Certificate', route: '/certificate/share-printing',                  iconName: 'Medal',          colorCls: 'bg-orange-50 text-orange-600 border-orange-100',   category: 'Certificates' },
];

/** Default 8 items shown before the user customises */
export const DEFAULT_ENABLED_QA_IDS = [
  'new-member', 'new-rd', 'new-sb', 'record-recovery',
  'print-demand', 'db-backup', 'import-demand', 'generate-demand',
];

export const QA_STORAGE_KEY = 'lms-quick-actions-config';
export const QA_BROADCAST_CHANNEL = 'lms_quick_actions';

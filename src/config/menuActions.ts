// Single source of truth for Navbar action -> window route, shared between
// Navbar.tsx (build the menu) and ProtectedRoute.tsx (enforce access when a
// window is opened directly). Keep this in sync with the backend's
// backend/src/modules/auth/menu-action-map.ts, which maps the same action
// codes to legacy menuids for Configure UserLevel Default Rights.
export const ACTION_ROUTE_MAP: Record<string, { route: string; electronMethod: string }> = {
  // Loan related
  'LOAN_APP': { route: '/loan-application', electronMethod: 'openLoanAppWindow' },
  'CHANGE_LOAN_SURETY': { route: '/change-loan-surety', electronMethod: 'openNewWindow' },
  'INTEREST_CALC_POST': { route: '/interest-calculation-posting', electronMethod: 'openNewWindow' },

  // Payment related
  'RECEIPT_PAYMENT_VOUCHER_CREATION': { route: '/transaction/receipt-payment/payment-voucher-creation', electronMethod: 'openNewWindow' },
  'VOUCHER_PAYMENT': { route: '/transaction/receipt-payment/voucher-payment', electronMethod: 'openNewWindow' },
  'RECEIPT_PAYMENT': { route: '/transaction/receipt-payment/receipt', electronMethod: 'openNewWindow' },
  'RECEIPT_DIVIDEND_PAYMENT': { route: '/transaction/receipt-payment/dividend-payment', electronMethod: 'openNewWindow' },

  // Fixed Deposit related
  'FD_RECEIPT': { route: '/transaction/fixed-deposit/receipt', electronMethod: 'openNewWindow' },
  'FD_INTEREST_VOUCHER_POSTING': { route: '/transaction/fixed-deposit/interest-voucher-posting', electronMethod: 'openNewWindow' },
  'FD_WITHDRAWAL_INT_PAYMENT': { route: '/transaction/fixed-deposit/withdrawal-interest-payment', electronMethod: 'openNewWindow' },

  // Transaction components
  'SAVING_RECEIPT_PAYMENT': { route: '/transaction/saving', electronMethod: 'openNewWindow' },
  'JOURNAL_TRANSFER_ENTRY': { route: '/transaction/journal-transfer', electronMethod: 'openNewWindow' },
  'LOAN_PAYMENT': { route: '/transaction/loan-payment', electronMethod: 'openNewWindow' },
  'LOAN_REPAYMENT': { route: '/transaction/loan-repayment', electronMethod: 'openNewWindow' },
  'LOAN_EARLY_CLOSURE': { route: '/transaction/loan-early-closure', electronMethod: 'openNewWindow' },
  'COMPULSORY_DEPOSIT_TRANSACTION': { route: '/transaction/compulsory-deposit', electronMethod: 'openNewWindow' },
  'MEMBER_BALANCE_TRANSFER': { route: '/transaction/member-balance-transfer', electronMethod: 'openNewWindow' },
  'PASS_TRANSACTIONS': { route: '/transaction/pass-transactions', electronMethod: 'openNewWindow' },

  // Administration
  'DAY_END': { route: '/day-end', electronMethod: 'openNewWindow' },
  'INTEREST_CALC': { route: '/interest-calculation', electronMethod: 'openNewWindow' },
  'DEPOSIT_LOAN_SLAB': { route: '/deposit-loan-slab', electronMethod: 'openNewWindow' },
  'HEAD_ADD_MOD': { route: '/head-addition-modification', electronMethod: 'openNewWindow' },
  'HEAD_OPEN_BAL': { route: '/head-opening-balance', electronMethod: 'openNewWindow' },

  // Security
  'USER_MANAGEMENT': { route: '/user-management', electronMethod: 'openNewWindow' },
  'ROLE_MANAGEMENT': { route: '/role-management', electronMethod: 'openNewWindow' },
  'CHANGE_PASSWORD': { route: '/change-password', electronMethod: 'openNewWindow' },
  'MY_PROFILE': { route: '/my-profile', electronMethod: 'openNewWindow' },
  'LOGOUT_USER': { route: '/logout-user', electronMethod: 'openNewWindow' },

  // Financial Year
  'FIN_YEAR_TRANSFER': { route: '/financial-year/transfer-entries', electronMethod: 'openNewWindow' },
  'FIN_YEAR_CLOSING': { route: '/financial-year/closing', electronMethod: 'openNewWindow' },
  'FIN_YEAR_BALANCE_TRANSFER': { route: '/financial-year/balance-transfer', electronMethod: 'openNewWindow' },
  'FIN_YEAR_PL_PROCESS': { route: '/financial-year/pl-process', electronMethod: 'openNewWindow' },

  // Member Analytics
  'SAAKH_SCORE': { route: '/saakh-score', electronMethod: 'openNewWindow' },

  // Business Rules and Printing
  'MODIFY_BIZ_RULES': { route: '/modify-business-rules', electronMethod: 'openNewWindow' },
  'DEMAND_PRINT_ORDER': { route: '/demand-print-order', electronMethod: 'openNewWindow' },

  // Certificate Setting and Printing
  'CERT_PARAM_SETTING': { route: '/certificate/parameter-setting', electronMethod: 'openNewWindow' },
  'FD_CERT_PRINT': { route: '/certificate/fd-printing', electronMethod: 'openNewWindow' },
  'SHARE_CERT_PRINT': { route: '/certificate/share-printing', electronMethod: 'openNewWindow' },
  'PASSBOOK_PARAM_SETTING': { route: '/certificate/passbook-parameter', electronMethod: 'openNewWindow' },

  // Masters
  'MEMBER_MASTER': { route: '/masters/member', electronMethod: 'openNewWindow' },
  'SIGNATURE_SCANNING': { route: '/masters/signature-scanning', electronMethod: 'openNewWindow' },
  'SAVING_AC_OPENING': { route: '/masters/saving-account-opening', electronMethod: 'openNewWindow' },
  'WING_OFFICE_MASTER': { route: '/masters/wing-office', electronMethod: 'openNewWindow' },
  'MODIFY_FD_AC': { route: '/masters/modify-fd-account', electronMethod: 'openNewWindow' },
  'MODIFY_MEMBER_BAL': { route: '/masters/modify-member-balance', electronMethod: 'openNewWindow' },
  'CAST_CATEGORY': { route: '/masters/cast-category', electronMethod: 'openNewWindow' },
  'DESIGNATION_MASTER': { route: '/masters/designation', electronMethod: 'openNewWindow' },
  'FD_RD_SB_ENTRY': { route: '/masters/data-entry/fd-rd-sb', electronMethod: 'openNewWindow' },
  'LOAN_ENTRY': { route: '/masters/data-entry/loan', electronMethod: 'openNewWindow' },
  'RD_AC_OPENING': { route: '/masters/rd-account/opening', electronMethod: 'openNewWindow' },
  'PASS_RD_AC': { route: '/masters/rd-account/pass', electronMethod: 'openNewWindow' },

  // Demand & Recovery List
  'IMPORT_DEMAND_LIST': { route: '/transaction/demand-recovery/import-demand-list', electronMethod: 'openNewWindow' },
  'GENERATE': { route: '/transaction/demand-recovery/generate', electronMethod: 'openNewWindow' },
  'UPDATION_LEDGER_POSTING': { route: '/transaction/demand-recovery/updation-ledger-posting', electronMethod: 'openNewWindow' },
  'PRINT_MEMBERS_DEMAND_LIST': { route: '/transaction/demand-recovery/print-members-demand-list', electronMethod: 'openNewWindow' },
  'CHANGE_MEMBER_OFFICE': { route: '/transaction/demand-recovery/change-member-office', electronMethod: 'openNewWindow' },
  'MODIFY_SHORT_RECOVERY': { route: '/transaction/demand-recovery/modify-short-recovery', electronMethod: 'openNewWindow' },

  // Print Vouchers
  'RECEIPT_PAYMENT_VOUCHER': { route: '/reports/monthly/print-vouchers/receipt-payment', electronMethod: 'openNewWindow' },
  'JOURNAL_TRANSFER_VOUCHER': { route: '/reports/monthly/print-vouchers/journal-transfer', electronMethod: 'openNewWindow' },

  // Reports
  'MEMBER_LEDGER_REPORT': { route: '/reports/member-ledger', electronMethod: 'openNewWindow' },
  'GENERAL_LEDGER': { route: '/reports/general-ledger', electronMethod: 'openNewWindow' },
  'MEMBER_DETAIL_LEDGER': { route: '/reports/member-detail-ledger', electronMethod: 'openNewWindow' },
  'ACCOUNT_BALANCE': { route: '/reports/account-balance', electronMethod: 'openNewWindow' },
  'SURETY_REGISTER': { route: '/reports/surety-register', electronMethod: 'openNewWindow' },
  'DEPOSIT_DUE_DATE_REGISTER': { route: '/reports/deposit-due-date-register', electronMethod: 'openNewWindow' },
  'PASS_BOOK_PRINTING': { route: '/reports/pass-book-printing', electronMethod: 'openNewWindow' },

  // Daily Reports
  'CASH_BOOK_RECEIPTWISE': { route: '/reports/daily/cash-book-receiptwise', electronMethod: 'openNewWindow' },
  'CASH_BOOK': { route: '/reports/daily/cash-book', electronMethod: 'openNewWindow' },
  'DAY_BOOK': { route: '/reports/daily/day-book', electronMethod: 'openNewWindow' },
  'DAY_BOOK_SB': { route: '/reports/daily/day-book-sb', electronMethod: 'openNewWindow' },
  'CONSOLIDATION_DAILY_AC': { route: '/reports/daily/consolidation', electronMethod: 'openNewWindow' },

  // Monthly Reports
  'CASH_BOOK_MONTHLY': { route: '/reports/monthly/cash-book-monthly', electronMethod: 'openNewWindow' },
  'DETAIL_LEDGER': { route: '/reports/monthly/detail-ledger', electronMethod: 'openNewWindow' },
  'BANK_DETAIL_LEDGER': { route: '/reports/monthly/bank-detail-ledger', electronMethod: 'openNewWindow' },
  'DEFAULTER_LIST': { route: '/reports/monthly/defaulter-list', electronMethod: 'openNewWindow' },
  'NEW_LOAN_DISBURSED': { route: '/reports/monthly/new-loan-disbursed', electronMethod: 'openNewWindow' },
  'MEMBER_LOAN_LEDGER': { route: '/reports/monthly/member-loan-ledger', electronMethod: 'openNewWindow' },
  'LOAN_ACCOUNT_STATEMENT': { route: '/reports/account-reports/loan-statement', electronMethod: 'openNewWindow' },

  // Yearly Reports
  'P_L_BALANCE_SHEET': { route: '/reports/yearly/pl-balance-sheet', electronMethod: 'openNewWindow' },
  'VOTERS_WITHDRAWL_LIST': { route: '/reports/yearly/members/voters-withdrawal-list', electronMethod: 'openNewWindow' },
  'DIVIDEND_REPORT': { route: '/reports/yearly/interest-list/dividend-report', electronMethod: 'openNewWindow' },
  'DIVIDEND_PAID': { route: '/reports/yearly/interest-list/dividend-paid', electronMethod: 'openNewWindow' },
  'INT_LIST_CD_MD_SHRt': { route: '/reports/yearly/interest-list/cd-md-shrt', electronMethod: 'openNewWindow' },
  'DIVIDEND_WARRANT': { route: '/reports/yearly/interest-list/dividend-warrant', electronMethod: 'openNewWindow' },
  'DEFINE_TRIAL_BALANCE': { route: '/reports/yearly/customized-trial-balance/define-trial-balance', electronMethod: 'openNewWindow' },
  'OPEN_TRIAL_BALANCE': { route: '/reports/yearly/customized-trial-balance/open-trial-balance', electronMethod: 'openNewWindow' },
  'DEFINE_BALANCE_SHEET': { route: '/reports/yearly/customized-trial-balance/define-balance-sheet', electronMethod: 'openNewWindow' },
  'OPEN_BALANCE_SHEET': { route: '/reports/yearly/customized-trial-balance/open-balance-sheet', electronMethod: 'openNewWindow' },
  'MEMBER_LOAN_DETAIL': { route: '/reports/yearly/member-loan-detail', electronMethod: 'openNewWindow' },
  'SHARE_WARRANT_PRINTING': { route: '/reports/yearly/share-warrant-printing', electronMethod: 'openNewWindow' },
  'ANNUAL_MEMBER_STATEMENT': { route: '/reports/yearly/annual-member-statement', electronMethod: 'openNewWindow' },
  'YEARLY_MEMBER_STATEMENT': { route: '/reports/yearly/yearly-member-statement', electronMethod: 'openNewWindow' },
  'MEMBER_LEDGER': { route: '/reports/yearly/member-ledger', electronMethod: 'openNewWindow' },
  'MEMBER_STATEMENT': { route: '/reports/yearly/member-statement', electronMethod: 'openNewWindow' },
  'SAVING_STATEMENT': { route: '/reports/yearly/member-statement/saving-statement', electronMethod: 'openNewWindow' },
  'RD_STATEMENT': { route: '/reports/yearly/member-statement/rd-statement', electronMethod: 'openNewWindow' },
  'FD_STATEMENT': { route: '/reports/yearly/member-statement/fd-statement', electronMethod: 'openNewWindow' },
  'NEW_SHARE_CERTIFICATE': { route: '/reports/yearly/member-statement/new-share-certificate', electronMethod: 'openNewWindow' },
  'INTEREST_CERTIFICATE': { route: '/reports/yearly/member-statement/interest-certificate', electronMethod: 'openNewWindow' },
  'LOAN_NIL_CERTIFICATE': { route: '/reports/yearly/member-statement/loan-nil-certificate', electronMethod: 'openNewWindow' },
  // Utility Routes
  'PREMATURE_RD_AC': { route: '/utility/premature-information/rd', electronMethod: 'openNewWindow' },
  'PREMATURE_SB_AC': { route: '/utility/premature-information/sb', electronMethod: 'openNewWindow' },
  'CALCULATOR': { route: '/utility/calculator', electronMethod: 'openNewWindow' },
  'FIND': { route: '/utility/find', electronMethod: 'openNewWindow' },
  'MEMBER_BALANCE': { route: '/utility/member-balance', electronMethod: 'openNewWindow' },
  'EMI_CHART': { route: '/utility/emi-chart', electronMethod: 'openNewWindow' },
  'DATABASE_BACKUP': { route: '/utility/database-backup', electronMethod: 'openNewWindow' },
  'UPDATE_SAVING_INTT': { route: '/utility/update-saving-interest', electronMethod: 'openNewWindow' },
  'INTEREST_RECEIVABLE_RECEIVED_STATEMENT': { route: '/utility/interest-receivable-received-statement', electronMethod: 'openNewWindow' },
  'COMMUNICATION_HUB': { route: '/utility/communication-center', electronMethod: 'openNewWindow' },
  // Help Routes
  'ABOUT': { route: '/help/about', electronMethod: 'openNewWindow' },
  'CONTENTS': { route: '/help/contents', electronMethod: 'openNewWindow' },
  // Other Reports
  'ACCOUNT_CLOSING_REGISTER': { route: '/reports/account-reports/account-closing-register', electronMethod: 'openNewWindow' },
  'FIXED_DEPOSIT_CERTIFICATE': { route: '/reports/account-reports/fixed-deposit-certificate', electronMethod: 'openNewWindow' },
  'SHARE_CERTIFICATE': { route: '/reports/account-reports/share-certificate', electronMethod: 'openNewWindow' },
  'RECURRING_DETAILS': { route: '/reports/account-reports/recurring-details', electronMethod: 'openNewWindow' },
  'RECOVERY_DETAILS': { route: '/reports/account-reports/recovery-details', electronMethod: 'openNewWindow' },
  'LOAN_CONTRIBUTIONS_REGISTER': { route: '/reports/account-reports/loan-contributions-register', electronMethod: 'openNewWindow' },
  'LIEN_ACCOUNT_INFORMATION': { route: '/reports/account-reports/lien-account-information', electronMethod: 'openNewWindow' },
  'SETTINGS': { route: '/settings', electronMethod: 'openSettingsWindow' },
};

// Actions deliberately never gated by menu-rights: generic in-window actions
// with no menu concept (File menu), and app-chrome every user must always
// reach. Kept out of ACTION_ROUTE_MAP filtering below via this exclusion set
// rather than by omission, so it's explicit and easy to audit.
const NEVER_GATED = new Set(['SETTINGS', 'MY_PROFILE', 'SAVE', 'CANCEL', 'DELETE', 'REFRESH', 'PRINT', 'EXIT']);

/** route path -> action code, for enforcing access when a window is opened
 * directly (e.g. via IPC deep link) rather than clicked from the Navbar. */
export const ROUTE_TO_ACTION: Record<string, string> = Object.fromEntries(
  Object.entries(ACTION_ROUTE_MAP)
    .filter(([action]) => !NEVER_GATED.has(action))
    .map(([action, { route }]) => [route, action]),
);

/** True if `action` should open given the user's allowedActions from login.
 * null/undefined allowedActions means unrestricted (SYSTEM/ADMINISTRATOR). */
export function isActionAllowed(allowedActions: string[] | null | undefined, action?: string): boolean {
  if (!action) return true;
  if (NEVER_GATED.has(action)) return true;
  if (!allowedActions) return true;
  return allowedActions.includes(action);
}

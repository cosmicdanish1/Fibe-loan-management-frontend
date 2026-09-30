/**
 * CENTRALIZED ROUTE CONFIGURATION
 * 
 * This file serves as the SINGLE SOURCE OF TRUTH for all application routes.
 * 
 * IMPORTANT: 
 * - All routes must be defined here first
 * - Use these constants in Navbar.tsx, main.ts, and App.tsx
 * - Never hardcode route strings elsewhere
 * - This prevents routing mismatches between frontend and Electron
 */

export const ROUTES = {
    // Auth
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    MEMBER_LOOKUP: '/common/member-lookup',

    // Administration - Loan Management
    LOAN_APPLICATION: '/loan-application',
    LOAN_MEMBER_LOOKUP: '/common/member-lookup',
    CHANGE_LOAN_SURETY: '/change-loan-surety',
    INTEREST_CALCULATION_POSTING: '/interest-calculation-posting',

    // Administration - Daily Operations
    DAY_END: '/day-end',
    INTEREST_CALCULATION: '/interest-calculation',
    DEPOSIT_LOAN_SLAB: '/deposit-loan-slab',
    HEAD_ADDITION_MODIFICATION: '/head-addition-modification',
    HEAD_OPENING_BALANCE: '/head-opening-balance',

    // Administration - Security Management
    USER_MANAGEMENT: '/user-management',
    ROLE_MANAGEMENT: '/role-management',
    CHANGE_PASSWORD: '/change-password',
    LOGOUT_USER: '/logout-user',

    // Administration - Financial Year Management
    FINANCIAL_YEAR_TRANSFER_ENTRIES: '/financial-year/transfer-entries',
    FINANCIAL_YEAR_CLOSING: '/financial-year/closing',
    FINANCIAL_YEAR_BALANCE_TRANSFER: '/financial-year/balance-transfer',

    // Administration - Business Rules & Printing
    MODIFY_BUSINESS_RULES: '/modify-business-rules',
    DEMAND_PRINT_ORDER: '/demand-print-order',

    // Administration - Member Analytics
    SAAKH_SCORE: '/saakh-score',

    // Administration - Certificate Setting and Printing
    CERTIFICATE_PARAMETER_SETTING: '/certificate/parameter-setting',
    CERTIFICATE_SHARE_PRINTING: '/certificate/share-printing',
    CERTIFICATE_PASSBOOK_PARAMETER: '/certificate/passbook-parameter',

    // Masters
    MEMBER_MASTER: '/masters/member',
    SIGNATURE_SCANNING: '/masters/signature-scanning',
    RD_ACCOUNT_OPENING: '/masters/rd-account/opening',
    RD_ACCOUNT_PASS: '/masters/rd-account/pass',
    SAVING_ACCOUNT_OPENING: '/masters/saving-account-opening',
    WING_OFFICE_MASTER: '/masters/wing-office',
    MODIFY_MEMBER_BALANCE: '/masters/modify-member-balance',
    CAST_CATEGORY: '/masters/cast-category',
    DESIGNATION_MASTER: '/masters/designation',

    // Masters - Data Entry
    FD_RD_SB_ENTRY: '/masters/data-entry/fd-rd-sb',
    LOAN_ENTRY: '/masters/data-entry/loan',

    // Transaction - Receipt & Payment
    PAYMENT_VOUCHER_CREATION: '/transaction/receipt-payment/payment-voucher-creation',
    VOUCHER_PAYMENT: '/transaction/receipt-payment/voucher-payment',
    RECEIPT: '/transaction/receipt-payment/receipt',
    DIVIDEND_PAYMENT: '/transaction/receipt-payment/dividend-payment',

    // Transaction - Other Types
    SAVING: '/transaction/saving',
    JOURNAL_TRANSFER: '/transaction/journal-transfer',
    LOAN_PAYMENT: '/transaction/loan-payment',
    LOAN_REPAYMENT: '/transaction/loan-repayment',
    LOAN_SANCTION: '/loan-sanction',
    COMPULSORY_DEPOSIT: '/transaction/compulsory-deposit',
    PASS_TRANSACTIONS: '/transaction/pass-transactions',

    // Transaction - Demand & Recovery
    IMPORT_DEMAND_LIST: '/transaction/demand-recovery/import-demand-list',
    GENERATE_DEMAND: '/transaction/demand-recovery/generate',
    UPDATION_LEDGER_POSTING: '/transaction/demand-recovery/updation-ledger-posting',
    PRINT_MEMBERS_DEMAND_LIST: '/transaction/demand-recovery/print-members-demand-list',
    CHANGE_MEMBER_OFFICE: '/transaction/demand-recovery/change-member-office',
    MODIFY_SHORT_RECOVERY: '/transaction/demand-recovery/modify-short-recovery',

    // Reports - General
    MEMBER_LEDGER_REPORT: '/reports/member-ledger',
    MEMBER_LEDGER_REPORT_LOOKUP: '/common/member-lookup',
    GENERAL_LEDGER: '/reports/general-ledger',
    MEMBER_DETAIL_LEDGER: '/reports/member-detail-ledger',
    ACCOUNT_BALANCE: '/reports/account-balance',
    SURETY_REGISTER: '/reports/surety-register',
    DEPOSIT_DUE_DATE_REGISTER: '/reports/deposit-due-date-register',
    PASS_BOOK_PRINTING: '/reports/pass-book-printing',

    // Reports - Daily
    CASH_BOOK_RECEIPTWISE: '/reports/daily/cash-book-receiptwise',
    CASH_BOOK: '/reports/daily/cash-book',
    DAY_BOOK: '/reports/daily/day-book',
    DAY_BOOK_CD: '/reports/daily/day-book-cd',
    DAY_BOOK_SB: '/reports/daily/day-book-sb',
    CONSOLIDATION_DAILY_ACCOUNT: '/reports/daily/consolidation',

    // Reports - Monthly
    CASH_BOOK_MONTHLY: '/reports/monthly/cash-book-monthly',
    DETAIL_LEDGER: '/reports/monthly/detail-ledger',
    BANK_DETAIL_LEDGER: '/reports/monthly/bank-detail-ledger',
    DEFAULTER_LIST: '/reports/monthly/defaulter-list',
    NEW_LOAN_DISBURSED: '/reports/monthly/new-loan-disbursed',
    MEMBER_LOAN_LEDGER: '/reports/monthly/member-loan-ledger',

    // Reports - Print Vouchers
    RECEIPT_PAYMENT_VOUCHER: '/reports/monthly/print-vouchers/receipt-payment',
    JOURNAL_TRANSFER_VOUCHER: '/reports/monthly/print-vouchers/journal-transfer',

    // Reports - Yearly
    PL_BALANCE_SHEET: '/reports/yearly/pl-balance-sheet',
    VOTERS_WITHDRAWAL_LIST: '/reports/yearly/voters-withdrawal-list',
    DIVIDEND_REPORT: '/reports/yearly/dividend-report',
    DIVIDEND_PAID: '/reports/yearly/dividend-paid',
    INTEREST_LIST: '/reports/yearly/interest-list',
    DIVIDEND_WARRANT: '/reports/yearly/dividend-warrant',

    // Reports - Yearly (Additional)
    YEARLY_MEMBER_LEDGER: '/reports/yearly/member-ledger',
    YEARLY_MEMBER_LOAN_DETAIL: '/reports/yearly/member-loan-detail',
    YEARLY_SHARE_WARRANT_PRINTING: '/reports/yearly/share-warrant-printing',
    YEARLY_ANNUAL_MEMBER_STATEMENT: '/reports/yearly/annual-member-statement',
    YEARLY_MEMBER_STATEMENT: '/reports/yearly/yearly-member-statement',

    // Reports - Member Statement
    MEMBER_STATEMENT: '/reports/member-statement/member-statement',
    SAVING_STATEMENT: '/reports/member-statement/saving-statement',
    RD_STATEMENT: '/reports/member-statement/rd-statement',
    RD_STATEMENT_NEW: '/reports/member-statement/rd-statement-new',
    NEW_SHARE_CERTIFICATE: '/reports/member-statement/new-share-certificate',
    INTEREST_CERTIFICATE: '/reports/member-statement/interest-certificate',
    LOAN_NIL_CERTIFICATE: '/reports/member-statement/loan-nil-certificate',

    // Reports - Account Reports
    ACCOUNT_CLOSING_REGISTER: '/reports/account-reports/account-closing-register',
    SHARE_CERTIFICATE: '/reports/account-reports/share-certificate',
    RECURRING_DETAILS: '/reports/account-reports/recurring-details',
    RECOVERY_DETAILS: '/reports/account-reports/recovery-details',
    LOAN_CONTRIBUTIONS_REGISTER: '/reports/account-reports/loan-contributions-register',
    LIEN_ACCOUNT_INFORMATION: '/reports/account-reports/lien-account-information',

    // Utility
    PREMATURE_INFORMATION_RD: '/utility/premature-information/rd',
    PREMATURE_INFORMATION_SB: '/utility/premature-information/sb',
    CALCULATOR: '/utility/calculator',
    FIND: '/utility/find',
    MEMBER_BALANCE: '/utility/member-balance',
    MEMBER_BALANCE_LOOKUP: '/common/member-lookup',
    EMI_CHART: '/utility/emi-chart',
    DATABASE_BACKUP: '/utility/database-backup',
    UPDATE_SAVING_INTEREST: '/utility/update-saving-interest',
    INTEREST_RECEIVABLE_RECEIVED_STATEMENT: '/utility/interest-receivable-received-statement',

    // Help
    ABOUT: '/help/about',
    CONTENTS: '/help/contents',

    // Exit
    EXIT_OPTION1: '/exit/option1',

    // Settings
    SETTINGS: '/settings',
} as const;

// Type for route values
export type RouteValue = typeof ROUTES[keyof typeof ROUTES];

/**
 * Helper function to validate if a string is a valid route
 */
export function isValidRoute(route: string): route is RouteValue {
    return Object.values(ROUTES).includes(route as RouteValue);
}

/**
 * Get route by key name
 */
export function getRoute(key: keyof typeof ROUTES): string {
    return ROUTES[key];
}

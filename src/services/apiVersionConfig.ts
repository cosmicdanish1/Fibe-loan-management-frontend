/**
 * API Version Configuration
 * 
 * Migration complete: All modules now use V2 (restructured) backend services.
 * The /v2 prefix has been removed from the backend controllers as they are now primary.
 * 
 * @version 2.0 - Fully Migrated
 */

// All flags are now essentially fixed to true
export const API_VERSION_FLAGS = {
    USE_V2_MEMBER_API: true,
    USE_V2_LOAN_API: true,
    USE_V2_TRANSACTION_API: true,
    USE_V2_REPORT_API: true,
    USE_V2_CHANGE_SURETY: true,
    USE_V2_MEMBER_LOOKUP: true,
    USE_V2_LOAN_CASES: true,
};

// Base URLs - dynamic; reads server IP from Electron config in production
// Always import getApiBaseUrl and use: const base = await getApiBaseUrl();
export { getApiBaseUrl, getApiBaseUrlSync } from './serverConfig';

/** @deprecated Use getApiBaseUrl() instead — hardcoded URL breaks LAN deployment */
export const API_BASE_URL = 'http://localhost:3001/api/v1';
export const API_V2_PREFIX = ''; // Removed prefix as V2 is now primary

/**
 * API Route Mappings
 * Now points directly to the primary (restructured) endpoints
 */
export const API_ROUTES = {
    // Member routes
    members: {
        list: () => '/members',
        get: (id: number) => `/members/${id}`,
        lookup: () => '/members/lookup',
        balance: (memberNo: string) => `/members/balance/${memberNo}`,
        details: (memberNo: string) => `/members/details/${memberNo}`,
        statistics: () => '/members/statistics',
    },

    // Loan routes
    loans: {
        cases: () => '/loans/cases',
        memberCases: (memberNo: string) => `/loans/member/${memberNo}/cases`,
        caseDetails: (caseNo: string) => `/loans/case/${caseNo}`,
        sanctioned: () => '/loans/sanctioned',
        pending: () => '/loans/cases',
        sanction: (caseNo: string) => `/loans/sanction/${caseNo}`,

        // Loan application - matching the new v2-as-primary route
        apply: () => '/loans/loan-application',

        // Change Surety endpoints
        changeSurety: (caseNo: string) => `/loans/surety/${caseNo}`,
        getSureties: (caseNo: string) => `/loans/surety/${caseNo}`,
        // Returns all loan cases (pending + active/disbursed) for a member — used by surety form
        suretyCases: (memberNo: string) => `/loans/member/${memberNo}/surety-cases`,

        // Repayment endpoints
        recordRepayment: () => '/loans/repayment',
        memberRepaymentHistory: (mbno: string) => `/loans/member/${mbno}/repayment-history`,
        loanRepaymentSummary: (caseNo: string) => `/loans/case/${caseNo}/repayment-summary`,
        memberBalanceHistory: (mbno: string) => `/loans/member/${mbno}/balance-history`,
        monthEndSnapshot: () => '/loans/month-end/snapshot',
        monthEndReport: () => '/loans/month-end/report',
    },

    // Transaction routes
    transactions: {
        pendingVouchers: () => '/transactions/vouchers/pending',
        generateVoucher: () => '/transactions/voucher',
        generateLoanVoucher: () => '/transactions/loan-voucher',
        passTransaction: (voucherNo: string) => `/transactions/pass/${voucherNo}`,
        voucherDetails: (voucherNo: string) => `/transactions/voucher/${voucherNo}`,
    },

    // Report routes
    reports: {
        heads: () => '/report/heads',
        banks: () => '/report/banks',
        wings: () => '/report/wings',
        offices: (wingNo?: string) => {
            const base = '/report/offices';
            return wingNo ? `${base}?wingNo=${wingNo}` : base;
        },
        loanTypes: () => '/report/loan-types',
        defaulters: () => '/report/defaulters',
        cashbookMonthly: () => '/report/cashbook/monthly',
        memberProfile: (memberNo: string) => `/report/member/profile/${memberNo}`,
        diagnostic: () => '/report/diagnostic',
    },
};

/**
 * Helper to log which API version is being used (kept for backward compatibility with calls)
 */
export function logApiVersion(feature: string, _useV2: boolean): void {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[API] ${feature}: Using Primary (Restructured) endpoint`);
    }
}

export default API_ROUTES;

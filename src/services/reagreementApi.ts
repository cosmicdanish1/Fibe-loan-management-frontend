// Loan re-agreement API client. The backend does ALL calculation (quote), the browser only sends
// the user's inputs (tenure, rate, application date) and shows what comes back.
import apiService from './api';
import { getApiBaseUrl } from './serverConfig';

export interface QuoteError { field: 'tenure' | 'rate' | 'applicationDate' | 'loan' | 'general'; code: string; message: string }

export interface QuoteScheduleRow {
    no: number; dueMonth: string; openingBalance: number; principal: number; interest: number; installment: number; closingBalance: number;
}

export interface ReagreementQuote {
    valid: boolean;
    errors: QuoteError[];
    warnings: string[];
    loan: null | { mbno: string; loantype: string; loanTypeName: string; oldCaseNo: string; memberName: string; balance: number; oldVersionNo: number | null };
    applicationDate: string;
    asOf: string;
    position: null | {
        outstandingPrincipal: number; nrPrincipal: number; nrInterest: number; penaltyDue: number; apInterest: number;
        closureInterestTotal: number; paidInstallments: number;
        unpaidInstallments: Array<{ installmentNo: number; dueDate: string; principalDue: number; interestDue: number; penalDue: number }>;
    };
    old: null | {
        rate: number; installments: number; monthlyPrincipal: number; monthlyInterest: number; monthlyInstallment: number;
        remainingInstallments: number; remainingPayable: number;
    };
    neu: null | {
        rate: number; installments: number; monthlyPrincipal: number; monthlyInterest: number; monthlyInstallment: number;
        slot: number; subSlot: string | null; interestDelayMonths: number; delayMonths: number; delayInterest: number;
        totalRbInterest: number; totalInterestForEmi: number; carriedInterest: number; roundingMode: string; firstDueMonth: string; totalPayable: number;
    };
    collect: { nrInterest: number; penalty: number; total: number };
    schedule: QuoteScheduleRow[];
}

export interface ReagreementDocInfo { issueNo: number; issuedAt: string; voided: boolean; hasPdf: boolean; hasImage: boolean; hasSignedScan: boolean }

export interface ReagreementDto {
    id: number; reagreementNo: string; mbno: string; loantype: string; oldLoanCaseNo: string; newLoanCaseNo: string;
    status: 'APPLIED' | 'SANCTIONED' | 'VOUCHERED' | 'PASSED' | 'CANCELLED';
    voucherNo: string | null; applicationDate: string; sanctionDate: string | null; effectiveDate: string | null; firstDueMonth: string | null;
    old: { rate: number; installments: number; monthlyPrincipal: number; monthlyInterest: number; monthlyInstallment: number; paidInstallments: number };
    position: { outstandingPrincipal: number; nrPrincipal: number; nrInterest: number; penaltyDue: number; apInterest: number; closureInterestTotal: number };
    neu: { rate: number; installments: number; monthlyPrincipal: number; monthlyInterest: number; monthlyInstallment: number; delayInterest: number; totalRbInterest: number; totalInterestForEmi: number };
    collect: { nrInterest: number; penalty: number; total: number };
    reason: string | null; createdBy: string | null; createdAt: string; sanctionedBy: string | null; passedBy: string | null; passedAt: string | null;
    cancelledBy: string | null; cancelledAt: string | null; reversedBy: string | null; reversedAt: string | null; reversalReason: string | null;
    memberName?: string;
    documents?: ReagreementDocInfo[];
}

export interface ActiveLoanRow {
    loanCaseNo: string; loanType: string; loanTypeName: string; balance: number; rate: number; installments: number; paymentDate: string; openReagreement: string | null;
}

export interface ReagreementHistory {
    mbno: string; rootCaseNo: string;
    cases: Array<{ caseNo: string; loanType?: string; loanAmount?: number; balance?: number; rate?: number; installments?: number; startDate?: string; closedIntoCaseNo?: string | null }>;
    reagreements: ReagreementDto[];
}

const need = <T>(res: { success: boolean; data?: T; message?: string; error?: string }): T => {
    if (!res.success) throw new Error(res.message || res.error || 'Request failed');
    return res.data as T;
};

export const reagreementApi = {
    activeLoans: async (mbno: string) => need(await apiService.request<{ mbno: string; memberName: string; loans: ActiveLoanRow[] }>(`/loans/reagreement/member/${encodeURIComponent(mbno)}/loans`)),

    quote: async (input: { mbno: string; loancaseno: string; loantype?: string | undefined; newInstallments: number; newRate: number; applicationDate?: string | undefined; reagreementId?: number | undefined }) =>
        need(await apiService.request<ReagreementQuote>('/loans/reagreement/quote', { method: 'POST', body: JSON.stringify(input) })),

    apply: async (input: { mbno: string; loancaseno: string; loantype?: string | undefined; newInstallments: number; newRate: number; applicationDate?: string | undefined; reason?: string | undefined }) =>
        need(await apiService.request<{ id: number; reagreementNo: string; newLoanCaseNo: string; oldLoanCaseNo: string; status: string; quote: ReagreementQuote }>(
            '/loans/reagreement/apply', { method: 'POST', body: JSON.stringify(input) })),

    listOpen: async (mbno?: string) => need(await apiService.request<ReagreementDto[]>(`/loans/reagreement/open${mbno ? `?mbno=${encodeURIComponent(mbno)}` : ''}`)),

    cancel: async (id: number, reason: string) => need(await apiService.request<{ success: boolean; message: string }>(
        `/loans/reagreement/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })),

    getOne: async (id: number) => need(await apiService.request<ReagreementDto>(`/loans/reagreement/${id}`)),

    byCase: async (caseNo: string, mbno?: string) => need(await apiService.request<ReagreementDto | null>(
        `/loans/reagreement/by-case/${encodeURIComponent(caseNo)}${mbno ? `?mbno=${encodeURIComponent(mbno)}` : ''}`)),

    history: async (mbno: string, caseNo: string, loantype?: string) => need(await apiService.request<ReagreementHistory>(
        `/loans/reagreement/history/${encodeURIComponent(mbno)}/${encodeURIComponent(caseNo)}${loantype ? `?loantype=${encodeURIComponent(loantype)}` : ''}`)),

    log: async (id: number) => need(await apiService.request<Array<{ id: number; event: string; old_status: string | null; new_status: string | null; actor: string; at: string; remarks: string | null }>>(
        `/loans/reagreement/${id}/log`)),

    /** Reverses a passed re-agreement through the existing Pass Transactions endpoint (refused by the server once repayments exist). */
    reverse: async (voucherNo: string, reversedBy?: string) => need(await apiService.request<any>(
        `/transactions/reverse/${encodeURIComponent(voucherNo)}`, { method: 'POST', body: JSON.stringify({ reversedBy: reversedBy || 'admin' }) })),
};

export type DocFormat = 'pdf' | 'png' | 'text';

/** Fetches the saved agreement (or the DRAFT copy) as a Blob, with the login token. */
export async function fetchAgreementBlob(id: number, format: DocFormat, opts: { draft?: boolean | undefined; issue?: number | undefined } = {}): Promise<Blob> {
    const base = await getApiBaseUrl();
    const token = localStorage.getItem('accessToken');
    const q = `format=${format}${opts.issue ? `&issue=${opts.issue}` : ''}`;
    const res = await fetch(`${base}/loans/reagreement/${id}/${opts.draft ? 'draft' : 'document'}?${q}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        let msg = `Could not load the agreement (HTTP ${res.status})`;
        try { const j = await res.json(); if (j?.message) msg = Array.isArray(j.message) ? j.message.join(', ') : j.message; } catch { /* keep default */ }
        throw new Error(msg);
    }
    return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Prints the agreement image through a hidden iframe (window.open is blocked app-wide in Electron). */
export function printImageBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(`<!doctype html><html><head><style>@page{size:A4 portrait;margin:8mm}html,body{margin:0;background:#fff}img{width:100%;height:auto;display:block}</style></head><body><img id="a" src="${url}"/></body></html>`);
    doc.close();
    const img = doc.getElementById('a') as HTMLImageElement;
    const go = () => {
        try { iframe.contentWindow!.focus(); iframe.contentWindow!.print(); } finally {
            setTimeout(() => { iframe.remove(); URL.revokeObjectURL(url); }, 60000);
        }
    };
    if (img.complete) go(); else img.onload = go;
}

export const fmtMoney = (n: number | string | null | undefined) =>
    n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtMonth = (iso?: string | null) => {
    if (!iso) return '—';
    const m = /^(\d{4})-(\d{2})/.exec(iso);
    if (!m) return iso;
    return `${MONTHS[parseInt(m[2]!, 10) - 1]}-${m[1]}`;
};

export const fmtDate = (iso?: string | null) => {
    if (!iso) return '—';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    return `${m[3]}-${MONTHS[parseInt(m[2]!, 10) - 1]}-${m[1]}`;
};

export const STATUS_TONE: Record<string, string> = {
    APPLIED: 'tone-warning', SANCTIONED: 'tone-warning', VOUCHERED: 'tone-warning', PASSED: 'tone-success', CANCELLED: 'tone-muted',
};
export const STATUS_LABEL: Record<string, string> = {
    APPLIED: 'Applied — awaiting sanction', SANCTIONED: 'Sanctioned — awaiting Loan Payment', VOUCHERED: 'Voucher created — awaiting Pass',
    PASSED: 'Passed — active', CANCELLED: 'Cancelled',
};

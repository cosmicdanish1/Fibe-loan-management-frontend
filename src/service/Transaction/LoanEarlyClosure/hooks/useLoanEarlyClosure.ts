import { useState, useCallback, useEffect } from 'react';
import { getApiBaseUrl } from '../../../../services/serverConfig';
import apiService from '../../../../services/api';

export interface ActiveLoan {
    loancaseno: string;
    loantype: string;
    loan_amt: number;
    balance: number;
    no_of_instal: number;
    instal_amt: number;
    /** Set once this case has been closed and folded into a successor —
     *  either by a real-time consolidation (PassTransactionService) or by
     *  legacy migration replay. null while the loan is still open/standalone. */
    consolidatedIntoLoancaseno: string | null;
}

export interface ConsolidationHistoryEntry {
    loancaseno: string;
    loantype: string;
    originalLoanAmt: number;
    closedBalance: number;
    closureDate: string | null;
}

export interface ConsolidationHistory {
    /** Cases this loan absorbed when they were closed into it. */
    absorbedCases: ConsolidationHistoryEntry[];
    /** Set if this loan was itself later closed into another case. */
    consolidatedIntoLoancaseno: string | null;
}

export interface RepaymentHistoryEntry {
    date: string;
    amount: number;
    principal: number;
    interest: number;
    penal: number;
    receiptNo: string | null;
    narration: string | null;
    isPayrollLagCredit?: boolean;
}

export interface PayrollAdjustment {
    date: string;
    principal: number;
    interest: number;
    total: number;
    receiptNo: string | null;
    predecessorLoanCaseNo: string | null;
    affectsOutstandingBalance: boolean;
    countsTowardCurrentInstallments: boolean;
}

export interface ClosurePenaltyPolicy {
    enabled: boolean;
    annualRate: number;
    activationDate: string | null;
}

export interface RbScheduleRow {
    installmentNo: number;
    openingBalance: number;
    rbInterest: number;
    principal: number;
    closingBalance: number;
}

export interface ClosureUnpaidInstallment {
    installmentNo: number;
    dueDate: string;
    principalDue: number;
    interestDue: number;
    penalDue: number;
    monthsOverdue: number;
    /** 0 = within grace, no penal yet. 1 = same-month late fee. 2 = monthly-step penal. */
    tier: 0 | 1 | 2;
}

export interface RdShareClosureAdjustment {
    currentRd: number;
    currentShare: number;
    rdMinBalance: number;
    shareMinBalance: number;
    rdAvailable: number;
    shareAvailable: number;
    appliedFromRdShare: number;
    fromRd: number;
    fromShare: number;
    payableByMember: number;
    yearcode: number | null;
    rdYearClosed: boolean;
}

export interface ClosureQuote {
    loanCaseNo: string;
    closureDate: string;
    outstandingPrincipal: number;
    /** Flat principal still owed across installments already due but unpaid. */
    nrPrincipal: number;
    /** Flat interest still owed across installments already due but unpaid. */
    nrInterest: number;
    /** How many installments haven't reached their due month yet — 0 collapses
     *  the AP term below to 0, since there's nothing left to average over. */
    futureInstallmentCount: number;
    /** (future principal opening + standard monthly principal) / 2. */
    averageRemainingPrincipal: number;
    /** averageRemainingPrincipal × monthly rate. */
    averageRbInterest: number;
    /** (monthlyInterestForEMI − averageRbInterest) × futureInstallmentCount —
     *  the AP (average-principal) closure interest on the future installments. */
    apInterest: number;
    /** nrInterest + apInterest — the actual interest charged at closure. */
    closureInterest: number;
    penalInterest: number;
    penaltyPolicy?: ClosurePenaltyPolicy;
    /** Post-consolidation predecessor principal already recovered through BSP;
     *  reduces closure principal but does not settle/advance an EMI. */
    payrollLagPrincipalOffset: number;
    adjustment: number;
    /** Payroll-lag credit, DETECTED (see backend recordLoanRepayment) but
     *  never auto-applied — negative, NOT included in finalClosureAmount
     *  below. 0 when no such credit applies to this loan. The UI offers this
     *  as a one-click suggestion for the Adjustment field; the operator must
     *  accept it and hit Recalc before it affects what's charged. */
    suggestedAdjustment: number;
    finalClosureAmount: number;
    /** null when applyRdShare was false in the request. */
    rdShareAdjustment: RdShareClosureAdjustment | null;
    /** What the member actually needs to pay — equals finalClosureAmount when
     *  rdShareAdjustment is null or nothing was available to apply. */
    payableByMember: number;
    unpaidInstallments: ClosureUnpaidInstallment[];
    payrollAdjustments: PayrollAdjustment[];
    /** Full contracted term. */
    totalInstallments: number;
    /** Installments already due (their month has started) AND fully settled —
     *  future not-yet-due installments count toward neither this nor totalInstallments' complement. */
    paidInstallments: number;
    // Raw ingredients behind the figures above, so the UI can show the actual
    // formulas instead of just the computed totals.
    loanAmt: number;
    originationLoanAmt?: number;
    effectiveSchedule?: {
        versionNo: number;
        source: string;
        effectiveDate: string;
        firstDueMonth: string;
        openingPrincipal: number;
        monthlyPrincipal: number;
        installmentCount: number;
        delayMonths: number;
    } | null;
    instalAmt: number;
    noOfInstal: number;
    totalPrincipalPaid: number;
    /** Full history so nothing needs re-deriving or looking up separately
     *  before deciding whether/how to close this loan. */
    consolidationHistory: ConsolidationHistory;
    repaymentHistory: RepaymentHistoryEntry[];
    rbSchedule: RbScheduleRow[];
}

export interface ClosureForm {
    mbno: string;
    memberName: string;
    selectedLoanCase: string;
    /** yyyy-mm-dd, defaults to today. What the quote/execution is calculated as of. */
    closureDate: string;
    adjustment: number;
    receiptNo: string;
    /** Adjust RD / Share Value toward the closure amount before asking the
     *  member to pay the rest — defaults to checked per business policy. */
    applyRdShare: boolean;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const defaultForm: ClosureForm = {
    mbno: '',
    memberName: '',
    selectedLoanCase: '',
    closureDate: todayIso(),
    adjustment: 0,
    receiptNo: '',
    applyRdShare: true,
};

export const useLoanEarlyClosure = () => {
    const [form, setForm] = useState<ClosureForm>(defaultForm);
    const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
    const [quote, setQuote] = useState<ClosureQuote | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [closed, setClosed] = useState(false);
    // Configurable from Modify Business Rules ("Loan Early Closure
    // Protection") — defaults to true (protective) until fetched.
    const [requireTypeConfirm, setRequireTypeConfirm] = useState(true);

    useEffect(() => {
        apiService.getBusinessRules()
            .then(res => {
                const v = res?.data?.RULE_EARLY_CLOSURE_REQUIRE_TYPE_CONFIRM;
                if (v !== undefined && v !== null) setRequireTypeConfirm(Boolean(v));
            })
            .catch(() => { /* keep the safe default on failure */ });
    }, []);

    const updateForm = <K extends keyof ClosureForm>(key: K, value: ClosureForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const fetchMemberLoans = useCallback(async (mbno: string) => {
        if (!mbno) return;
        setLoading(true);
        setMessage(null);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${base}/loans/member/${mbno}/master`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error('Member not found or no active loans');
            const data = await res.json();
            // No longer filtered to balance > 0 — closed/consolidated cases are
            // kept so the UI can show a member's FULL loan history (which case
            // absorbed which), not just what's currently open. The form only
            // lets an operator SELECT an open (balance > 0) case to close.
            const loans: ActiveLoan[] = data.data || data || [];
            setActiveLoans(loans);
            if (loans.filter(l => parseFloat(String(l.balance || 0)) > 0).length === 0) {
                setMessage({ type: 'error', text: 'No active loans found for this member.' });
            }
        } catch (err: any) {
            setActiveLoans([]);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchQuote = useCallback(async (loancaseno: string, adjustment: number, closureDate: string, applyRdShare: boolean, mbno: string) => {
        if (!loancaseno) return;
        setQuoteLoading(true);
        setMessage(null);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${base}/loans/early-closure/quote/${loancaseno}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                // mbno scopes the lookup — loancaseno alone isn't unique
                // across members, so without this a case-number collision
                // with an unrelated member's loan can silently quote the
                // wrong one.
                body: JSON.stringify({ adjustment, closureDate, applyRdShare, mbno }),
            });
            if (!res.ok) throw new Error('Failed to load closure quote');
            const data = await res.json();
            setQuote(data.data || data);
        } catch (err: any) {
            setQuote(null);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setQuoteLoading(false);
        }
    }, []);

    const handleMemberLookup = useCallback(async (mbno: string, memberName: string) => {
        setForm(prev => ({ ...prev, mbno, memberName, selectedLoanCase: '', adjustment: 0, closureDate: todayIso() }));
        setQuote(null);
        setClosed(false);
        await fetchMemberLoans(mbno);
    }, [fetchMemberLoans]);

    const handleLoanSelect = useCallback(async (loancaseno: string) => {
        setForm(prev => ({ ...prev, selectedLoanCase: loancaseno, adjustment: 0 }));
        setClosed(false);
        await fetchQuote(loancaseno, 0, form.closureDate, form.applyRdShare, form.mbno);
    }, [fetchQuote, form.closureDate, form.applyRdShare, form.mbno]);

    const recalculate = useCallback(async () => {
        if (form.selectedLoanCase) await fetchQuote(form.selectedLoanCase, form.adjustment, form.closureDate, form.applyRdShare, form.mbno);
    }, [form.selectedLoanCase, form.adjustment, form.closureDate, form.applyRdShare, form.mbno, fetchQuote]);

    const toggleApplyRdShare = useCallback(async (value: boolean) => {
        setForm(prev => ({ ...prev, applyRdShare: value }));
        if (form.selectedLoanCase) await fetchQuote(form.selectedLoanCase, form.adjustment, form.closureDate, value, form.mbno);
    }, [form.selectedLoanCase, form.adjustment, form.closureDate, form.mbno, fetchQuote]);

    /** One-click accept for quote.suggestedAdjustment (the detected
     *  payroll-lag credit) — per the user's explicit decision, this is
     *  NEVER applied silently. Copies the suggested value into the
     *  Adjustment field and immediately re-quotes with it, so the operator
     *  sees the new total before doing anything further (e.g. executing the
     *  closure) — a deliberate accept action, not an automatic one. */
    const applySuggestedAdjustment = useCallback(async () => {
        if (!quote || !form.selectedLoanCase || quote.suggestedAdjustment === 0) return;
        const value = form.adjustment + quote.suggestedAdjustment;
        setForm(prev => ({ ...prev, adjustment: value }));
        await fetchQuote(form.selectedLoanCase, value, form.closureDate, form.applyRdShare, form.mbno);
    }, [quote, form.selectedLoanCase, form.adjustment, form.closureDate, form.applyRdShare, form.mbno, fetchQuote]);

    const handleExecuteClosure = async () => {
        if (!form.selectedLoanCase || !quote) return;
        setLoading(true);
        setMessage(null);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${base}/loans/early-closure/execute/${form.selectedLoanCase}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    adjustment: form.adjustment,
                    receiptNo: form.receiptNo,
                    closureDate: form.closureDate,
                    applyRdShare: form.applyRdShare,
                    mbno: form.mbno,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to close loan');
            setMessage({ type: 'success', text: data.message });
            setClosed(true);
            await fetchMemberLoans(form.mbno);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setForm(defaultForm);
        setActiveLoans([]);
        setQuote(null);
        setMessage(null);
        setClosed(false);
    };

    return {
        form,
        activeLoans,
        quote,
        quoteLoading,
        loading,
        message,
        closed,
        requireTypeConfirm,
        updateForm,
        handleMemberLookup,
        handleLoanSelect,
        recalculate,
        toggleApplyRdShare,
        applySuggestedAdjustment,
        handleExecuteClosure,
        handleReset,
    };
};

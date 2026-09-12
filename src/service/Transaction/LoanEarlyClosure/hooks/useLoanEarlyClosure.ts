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
    /** Slot 1/2 interest, always charged regardless of when the loan closes. */
    compulsorySlotInterest: number;
    /** True reducing-balance interest accrued for installments 1..k (up to the closure point). */
    rbInterestTillClosure: number;
    /** Flat interest actually collected so far via the constant EMI. */
    flatInterestCollected: number;
    /** rbInterestTillClosure - flatInterestCollected — can be positive, zero, or negative. */
    rbAdjustment: number;
    /** compulsorySlotInterest + rbAdjustment — the actual interest charged at closure. */
    closureInterest: number;
    penalInterest: number;
    adjustment: number;
    finalClosureAmount: number;
    /** null when applyRdShare was false in the request. */
    rdShareAdjustment: RdShareClosureAdjustment | null;
    /** What the member actually needs to pay — equals finalClosureAmount when
     *  rdShareAdjustment is null or nothing was available to apply. */
    payableByMember: number;
    unpaidInstallments: ClosureUnpaidInstallment[];
    /** Full contracted term. */
    totalInstallments: number;
    /** Installments already due (their month has started) AND fully settled —
     *  future not-yet-due installments count toward neither this nor totalInstallments' complement. */
    paidInstallments: number;
    // Raw ingredients behind the figures above, so the UI can show the actual
    // formulas instead of just the computed totals.
    loanAmt: number;
    instalAmt: number;
    noOfInstal: number;
    totalPrincipalPaid: number;
    totalRBInterestFullSchedule: number;
    hasRbSchedule: boolean;
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
            const loans: ActiveLoan[] = (data.data || data || []).filter((l: any) => parseFloat(l.balance || 0) > 0);
            setActiveLoans(loans);
            if (loans.length === 0) setMessage({ type: 'error', text: 'No active loans found for this member.' });
        } catch (err: any) {
            setActiveLoans([]);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchQuote = useCallback(async (loancaseno: string, adjustment: number, closureDate: string, applyRdShare: boolean) => {
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
                body: JSON.stringify({ adjustment, closureDate, applyRdShare }),
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
        await fetchQuote(loancaseno, 0, form.closureDate, form.applyRdShare);
    }, [fetchQuote, form.closureDate, form.applyRdShare]);

    const recalculate = useCallback(async () => {
        if (form.selectedLoanCase) await fetchQuote(form.selectedLoanCase, form.adjustment, form.closureDate, form.applyRdShare);
    }, [form.selectedLoanCase, form.adjustment, form.closureDate, form.applyRdShare, fetchQuote]);

    const toggleApplyRdShare = useCallback(async (value: boolean) => {
        setForm(prev => ({ ...prev, applyRdShare: value }));
        if (form.selectedLoanCase) await fetchQuote(form.selectedLoanCase, form.adjustment, form.closureDate, value);
    }, [form.selectedLoanCase, form.adjustment, form.closureDate, fetchQuote]);

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
        handleExecuteClosure,
        handleReset,
    };
};

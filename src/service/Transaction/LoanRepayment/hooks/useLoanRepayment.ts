import { useState, useCallback, useRef, useEffect } from 'react';
import { getApiBaseUrl } from '../../../../services/serverConfig';

export interface ActiveLoan {
    loancaseno: string;
    loantype: string;
    loan_amt: number;
    balance: number;
    no_of_instal: number;
    instal_amt: number;
}

export interface UnpaidInstallment {
    installmentNo: number;
    dueDate: string;
    principalDue: number;
    interestDue: number;
    penalDue: number;
    monthsOverdue: number;
    /** 0 = within grace, no penal yet. 1 = same-month late fee. 2 = monthly-step penal. */
    tier: 0 | 1 | 2;
    /** Full contracted EMI of this installment (principal + interest). What is still owed is in the *Due fields. */
    emiAmount: number;
    principalPaid: number;
    interestPaid: number;
}

export interface EmiBreakdown {
    loanAmt: number;
    instalAmt: number;
    noOfInstal: number;
    monthlyPrincipal: number;
    monthlyInterestForEMI: number;
    totalInterestForEMI: number;
    totalRBInterestFullSchedule: number;
    compulsorySlotInterest: number;
    hasRbSchedule: boolean;
}

export interface DueStatus {
    loanCaseNo: string;
    oldestUnpaidInstallment: number | null;
    unpaidInstallments: UnpaidInstallment[];
    totalEmi: number;
    totalPrincipalDue: number;
    totalInterestDue: number;
    totalPenalDue: number;
    totalDue: number;
    /** Full contracted term. */
    totalInstallments: number;
    /** Installments already due (their month has started) AND fully settled. */
    paidInstallments: number;
    /** How the constant EMI itself was built — purely informational. */
    emiBreakdown: EmiBreakdown;
}

/** What the backend will post for an amount (frozen into the voucher when it is raised). */
export interface RepaymentPlanRow {
    installmentNo: number;
    month: number;
    year: number;
    amount: number;
    principal: number;
    interest: number;
    penal: number;
    monthsOverdue: number;
    tier: number;
}

export interface RepaymentPlan {
    amount: number;
    principal: number;
    interest: number;
    penal: number;
    dueTotal: number;
    rows: RepaymentPlanRow[];
}

export interface PendingRepayment {
    voucher_no: string;
    amount: number | string;
}

export interface RepaymentForm {
    mbno: string;
    memberName: string;
    selectedLoanCase: string;
    paymentAmount: number;
    receiptNo: string;
    narration: string;
}

const defaultForm: RepaymentForm = {
    mbno: '',
    memberName: '',
    selectedLoanCase: '',
    paymentAmount: 0,
    receiptNo: '',
    narration: 'Loan Repayment',
};

export const useLoanRepayment = () => {
    const [form, setForm] = useState<RepaymentForm>(defaultForm);
    const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
    const [dueStatus, setDueStatus] = useState<DueStatus | null>(null);
    const [dueStatusLoading, setDueStatusLoading] = useState(false);
    const [repaymentHistory, setRepaymentHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [flagNotice, setFlagNotice] = useState<string | null>(null);
    // ES-558: how the typed amount will be applied (from the server), and the voucher waiting in Past Transaction
    const [plan, setPlan] = useState<RepaymentPlan | null>(null);
    const [planError, setPlanError] = useState<string | null>(null);
    const [pendingRepayment, setPendingRepayment] = useState<PendingRepayment | null>(null);
    const [sentVoucher, setSentVoucher] = useState<{ voucherNo: string; amount: number } | null>(null);

    // Request-sequence guards: only the latest lookup of each kind may write state
    const loansSeq = useRef(0);
    const historySeq = useRef(0);
    const dueSeq = useRef(0);
    const planSeq = useRef(0);
    const submitting = useRef(false);

    const updateForm = <K extends keyof RepaymentForm>(key: K, value: RepaymentForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const authHeaders = (): Record<string, string> => {
        const token = localStorage.getItem('accessToken');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const loanTypeOf = (loancaseno: string) => activeLoans.find(l => l.loancaseno === loancaseno)?.loantype;

    const fetchMemberLoans = useCallback(async (mbno: string) => {
        if (!mbno) return;
        const seq = ++loansSeq.current;
        setLoading(true);
        setMessage(null);
        setFlagNotice(null);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/member/${mbno}/master`, { headers: authHeaders() });
            if (!res.ok) throw new Error('Member not found or no active loans');
            const data = await res.json();
            if (seq !== loansSeq.current) return;
            const rawLoans = data.data || data || [];
            const loans: ActiveLoan[] = (Array.isArray(rawLoans) ? rawLoans : []).filter((l: any) => parseFloat(l.balance || 0) > 0);
            setActiveLoans(loans);
            if (loans.length === 0) setMessage({ type: 'error', text: 'No active loans found for this member.' });
        } catch (err: any) {
            if (seq !== loansSeq.current) return;
            setActiveLoans([]);
            setMessage({ type: 'error', text: err.message });
        } finally {
            if (seq === loansSeq.current) setLoading(false);
        }
    }, []);

    const fetchRepaymentHistory = useCallback(async (mbno: string) => {
        if (!mbno) return;
        const seq = ++historySeq.current;
        setHistoryLoading(true);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/member/${mbno}/repayment-history`, { headers: authHeaders() });
            if (!res.ok) throw new Error('Failed to load repayment history');
            const data = await res.json();
            if (seq !== historySeq.current) return;
            const rows = data.data || data || [];
            setRepaymentHistory(Array.isArray(rows) ? rows : []);
        } catch {
            if (seq !== historySeq.current) return;
            setRepaymentHistory([]);
        } finally {
            if (seq === historySeq.current) setHistoryLoading(false);
        }
    }, []);

    // What the loan owes right now (oldest unpaid first), from the same engine Early Closure uses.
    const fetchDueStatus = useCallback(async (loancaseno: string): Promise<DueStatus | null> => {
        if (!loancaseno) return null;
        const seq = ++dueSeq.current;
        setDueStatusLoading(true);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/due-status/${loancaseno}`, { headers: authHeaders() });
            if (!res.ok) throw new Error('Failed to load due status');
            const data = await res.json();
            const status: DueStatus = data.data || data;
            if (seq !== dueSeq.current) return null;
            setDueStatus(status);
            return status;
        } catch {
            if (seq === dueSeq.current) setDueStatus(null);
            return null;
        } finally {
            if (seq === dueSeq.current) setDueStatusLoading(false);
        }
    }, []);

    // A repayment already waiting in Past Transaction for this loan (only one pending voucher per loan is allowed)
    const fetchPending = useCallback(async (mbno: string, loancaseno: string) => {
        if (!mbno || !loancaseno) { setPendingRepayment(null); return; }
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/repayment/pending/${mbno}/${loancaseno}`, { headers: authHeaders() });
            if (!res.ok) { setPendingRepayment(null); return; }
            const data = await res.json();
            const body = data.data || data;
            setPendingRepayment(body?.pending ?? null);
        } catch {
            setPendingRepayment(null);
        }
    }, []);

    const handleMemberLookup = useCallback(async (mbno: string, memberName: string) => {
        setForm(prev => ({ ...prev, mbno, memberName, selectedLoanCase: '', paymentAmount: 0 }));
        setDueStatus(null);
        setPlan(null);
        setPlanError(null);
        setPendingRepayment(null);
        setSentVoucher(null);
        dueSeq.current++;
        await fetchMemberLoans(mbno);
        await fetchRepaymentHistory(mbno);
        setFlagNotice(null);
    }, [fetchMemberLoans, fetchRepaymentHistory]);

    const handleLoanSelect = useCallback(async (loancaseno: string) => {
        setForm(prev => ({ ...prev, selectedLoanCase: loancaseno, paymentAmount: 0 }));
        setPlan(null);
        setPlanError(null);
        setSentVoucher(null);
        setMessage(null);
        const seq = dueSeq.current + 1; // the id fetchDueStatus is about to take
        const [status] = await Promise.all([fetchDueStatus(loancaseno), fetchPending(form.mbno, loancaseno)]);
        if (seq !== dueSeq.current) return; // a newer selection superseded this one
        // Loan Repayment collects what is due: the amount starts at the full dues and can be lowered (Custom).
        setForm(prev => ({ ...prev, paymentAmount: status?.totalDue || 0 }));
    }, [fetchDueStatus, fetchPending, form.mbno]);

    // Ask the server how the amount will be applied. It also says when the amount is more than the dues.
    useEffect(() => {
        if (!form.mbno || !form.selectedLoanCase || !(form.paymentAmount > 0)) {
            planSeq.current++;
            setPlan(null);
            setPlanError(null);
            return;
        }
        const seq = ++planSeq.current;
        const timer = setTimeout(async () => {
            try {
                const base = await getApiBaseUrl();
                const res = await fetch(`${base}/loans/repayment/preview`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify({
                        mbno: form.mbno, loancaseno: form.selectedLoanCase,
                        loantype: loanTypeOf(form.selectedLoanCase), amount: form.paymentAmount,
                    }),
                });
                const data = await res.json();
                if (seq !== planSeq.current) return;
                if (!res.ok) {
                    setPlan(null);
                    setPlanError(data.message || 'The amount could not be applied.');
                    return;
                }
                const body = data.data || data;
                setPlan(body.plan || null);
                setPlanError(null);
                setFlagNotice(body.flag?.message ?? null);
            } catch (err: any) {
                if (seq !== planSeq.current) return;
                setPlan(null);
                setPlanError(err?.message || 'The amount could not be checked.');
            }
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.mbno, form.selectedLoanCase, form.paymentAmount, dueStatus]);

    const handleSubmit = async () => {
        if (submitting.current) return;
        if (!form.mbno || !form.selectedLoanCase || form.paymentAmount <= 0) {
            setMessage({ type: 'error', text: 'Please fill all required fields.' });
            return;
        }
        if (planError) {
            setMessage({ type: 'error', text: planError });
            return;
        }
        submitting.current = true;
        setLoading(true);
        setMessage(null);
        setSentVoucher(null);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/repayment/hold`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    mbno: form.mbno,
                    loancaseno: form.selectedLoanCase,
                    loantype: loanTypeOf(form.selectedLoanCase),
                    amount: form.paymentAmount,
                    receiptNo: form.receiptNo,
                    narration: form.narration,
                    paymentMode: 'CASH',
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Repayment failed');
            const body = data.data || data;
            setMessage({ type: 'success', text: body.message || data.message });
            setSentVoucher({ voucherNo: body.voucherNo, amount: Number(body.amount ?? form.paymentAmount) });
            setFlagNotice(body.flag?.message ?? null);
            // Nothing is posted yet (it is posted when the voucher is passed), so the dues are unchanged; refresh the pending notice
            await fetchPending(form.mbno, form.selectedLoanCase);
            setForm(prev => ({ ...prev, receiptNo: '' }));
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            submitting.current = false;
            setLoading(false);
        }
    };

    const handleReset = () => {
        loansSeq.current++;
        historySeq.current++;
        dueSeq.current++;
        planSeq.current++;
        setForm(defaultForm);
        setActiveLoans([]);
        setDueStatus(null);
        setRepaymentHistory([]);
        setMessage(null);
        setFlagNotice(null);
        setPlan(null);
        setPlanError(null);
        setPendingRepayment(null);
        setSentVoucher(null);
    };

    return {
        form,
        activeLoans,
        dueStatus,
        dueStatusLoading,
        repaymentHistory,
        loading,
        historyLoading,
        message,
        flagNotice,
        plan,
        planError,
        pendingRepayment,
        sentVoucher,
        updateForm,
        handleMemberLookup,
        handleLoanSelect,
        handleSubmit,
        handleReset,
    };
};

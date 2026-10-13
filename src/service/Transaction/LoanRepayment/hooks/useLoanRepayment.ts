import { useState, useCallback, useRef } from 'react';
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

    // Request-sequence guards: only the latest lookup of each kind may write state
    const loansSeq = useRef(0);
    const historySeq = useRef(0);
    const dueSeq = useRef(0);
    const submitting = useRef(false);

    const updateForm = <K extends keyof RepaymentForm>(key: K, value: RepaymentForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const fetchMemberLoans = useCallback(async (mbno: string) => {
        if (!mbno) return;
        const seq = ++loansSeq.current;
        setLoading(true);
        setMessage(null);
        setFlagNotice(null);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${base}/loans/member/${mbno}/master`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
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
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${base}/loans/member/${mbno}/repayment-history`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
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

    // Server always recovers the oldest unpaid installment first regardless of
    // what's asked for, so the form shows what's actually due (with penal)
    // instead of letting the operator pick an arbitrary month.
    const fetchDueStatus = useCallback(async (loancaseno: string): Promise<DueStatus | null> => {
        if (!loancaseno) return null;
        const seq = ++dueSeq.current;
        setDueStatusLoading(true);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${base}/loans/due-status/${loancaseno}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
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

    const handleMemberLookup = useCallback(async (mbno: string, memberName: string) => {
        setForm(prev => ({ ...prev, mbno, memberName, selectedLoanCase: '', paymentAmount: 0 }));
        setDueStatus(null);
        dueSeq.current++;
        await fetchMemberLoans(mbno);
        await fetchRepaymentHistory(mbno);
        setFlagNotice(null);
    }, [fetchMemberLoans, fetchRepaymentHistory]);

    const handleLoanSelect = useCallback(async (loancaseno: string) => {
        setForm(prev => ({ ...prev, selectedLoanCase: loancaseno, paymentAmount: 0 }));
        const seq = dueSeq.current + 1; // the id fetchDueStatus is about to take
        const status = await fetchDueStatus(loancaseno);
        if (seq !== dueSeq.current) return; // a newer selection superseded this one
        // "Pay What's Due" (the default mode) means exactly that — 0 when
        // nothing is overdue, not the next not-yet-due EMI. A member who is
        // fully caught up shouldn't see a payable amount sitting in the box.
        setForm(prev => ({ ...prev, paymentAmount: status?.totalDue || 0 }));
    }, [fetchDueStatus]);

    const handleSubmit = async () => {
        if (submitting.current) return;
        if (!form.mbno || !form.selectedLoanCase || form.paymentAmount <= 0) {
            setMessage({ type: 'error', text: 'Please fill all required fields.' });
            return;
        }
        submitting.current = true;
        setLoading(true);
        setMessage(null);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${base}/loans/repayment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    mbno: form.mbno,
                    loancaseno: form.selectedLoanCase,
                    paymentAmount: form.paymentAmount,
                    receiptNo: form.receiptNo,
                    narration: form.narration,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Repayment failed');
            setMessage({ type: 'success', text: data.message });
            const flag = data.flag ?? data.data?.flag;
            setFlagNotice(flag?.message ?? null);
            // Refresh loans, due status and history after successful repayment
            await fetchMemberLoans(form.mbno);
            await fetchRepaymentHistory(form.mbno);
            await fetchDueStatus(form.selectedLoanCase);
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
        setForm(defaultForm);
        setActiveLoans([]);
        setDueStatus(null);
        setRepaymentHistory([]);
        setMessage(null);
        setFlagNotice(null);
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
        updateForm,
        handleMemberLookup,
        handleLoanSelect,
        handleSubmit,
        handleReset,
    };
};

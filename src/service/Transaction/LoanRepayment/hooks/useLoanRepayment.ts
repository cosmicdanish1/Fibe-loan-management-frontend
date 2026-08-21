import { useState, useCallback } from 'react';
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
}

export interface DueStatus {
    loanCaseNo: string;
    oldestUnpaidInstallment: number | null;
    unpaidInstallments: UnpaidInstallment[];
    totalPrincipalDue: number;
    totalInterestDue: number;
    totalPenalDue: number;
    totalDue: number;
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

    const updateForm = <K extends keyof RepaymentForm>(key: K, value: RepaymentForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const fetchMemberLoans = useCallback(async (mbno: string) => {
        if (!mbno) return;
        setLoading(true);
        setMessage(null);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/member/${mbno}/master`);
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

    const fetchRepaymentHistory = useCallback(async (mbno: string) => {
        if (!mbno) return;
        setHistoryLoading(true);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/member/${mbno}/repayment-history`);
            const data = await res.json();
            setRepaymentHistory(data.data || data || []);
        } catch {
            setRepaymentHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    // Server always recovers the oldest unpaid installment first regardless of
    // what's asked for, so the form shows what's actually due (with penal)
    // instead of letting the operator pick an arbitrary month.
    const fetchDueStatus = useCallback(async (loancaseno: string): Promise<DueStatus | null> => {
        if (!loancaseno) return null;
        setDueStatusLoading(true);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/case/${loancaseno}/due-status`);
            if (!res.ok) throw new Error('Failed to load due status');
            const data = await res.json();
            const status: DueStatus = data.data || data;
            setDueStatus(status);
            return status;
        } catch {
            setDueStatus(null);
            return null;
        } finally {
            setDueStatusLoading(false);
        }
    }, []);

    const handleMemberLookup = useCallback(async (mbno: string, memberName: string) => {
        setForm(prev => ({ ...prev, mbno, memberName, selectedLoanCase: '', paymentAmount: 0 }));
        setDueStatus(null);
        await fetchMemberLoans(mbno);
        await fetchRepaymentHistory(mbno);
    }, [fetchMemberLoans, fetchRepaymentHistory]);

    const handleLoanSelect = useCallback(async (loancaseno: string) => {
        const loan = activeLoans.find(l => l.loancaseno === loancaseno);
        setForm(prev => ({ ...prev, selectedLoanCase: loancaseno, paymentAmount: 0 }));
        const status = await fetchDueStatus(loancaseno);
        // Default the payment amount to what's actually owed (principal + interest
        // + penal across every unpaid installment); fall back to the plain EMI
        // when nothing is overdue yet (e.g. paying the very first installment on time).
        const defaultAmount = status && status.totalDue > 0
            ? status.totalDue
            : (loan ? parseFloat(loan.instal_amt as any) || 0 : 0);
        setForm(prev => ({ ...prev, paymentAmount: defaultAmount }));
    }, [activeLoans, fetchDueStatus]);

    const handleSubmit = async () => {
        if (!form.mbno || !form.selectedLoanCase || form.paymentAmount <= 0) {
            setMessage({ type: 'error', text: 'Please fill all required fields.' });
            return;
        }
        setLoading(true);
        setMessage(null);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/repayment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            // Refresh loans, due status and history after successful repayment
            await fetchMemberLoans(form.mbno);
            await fetchRepaymentHistory(form.mbno);
            await fetchDueStatus(form.selectedLoanCase);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setForm(defaultForm);
        setActiveLoans([]);
        setDueStatus(null);
        setRepaymentHistory([]);
        setMessage(null);
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
        updateForm,
        handleMemberLookup,
        handleLoanSelect,
        handleSubmit,
        handleReset,
    };
};

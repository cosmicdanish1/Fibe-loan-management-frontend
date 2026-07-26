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

export interface RepaymentForm {
    mbno: string;
    memberName: string;
    selectedLoanCase: string;
    paymentMonth: number;
    paymentYear: number;
    paymentAmount: number;
    receiptNo: string;
    narration: string;
}

const currentDate = new Date();

const defaultForm: RepaymentForm = {
    mbno: '',
    memberName: '',
    selectedLoanCase: '',
    paymentMonth: currentDate.getMonth() + 1,
    paymentYear: currentDate.getFullYear(),
    paymentAmount: 0,
    receiptNo: '',
    narration: 'Loan Repayment',
};

export const useLoanRepayment = () => {
    const [form, setForm] = useState<RepaymentForm>(defaultForm);
    const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
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

    const handleMemberLookup = useCallback(async (mbno: string, memberName: string) => {
        setForm(prev => ({ ...prev, mbno, memberName, selectedLoanCase: '', paymentAmount: 0 }));
        await fetchMemberLoans(mbno);
        await fetchRepaymentHistory(mbno);
    }, [fetchMemberLoans, fetchRepaymentHistory]);

    const handleLoanSelect = useCallback((loancaseno: string) => {
        const loan = activeLoans.find(l => l.loancaseno === loancaseno);
        setForm(prev => ({
            ...prev,
            selectedLoanCase: loancaseno,
            paymentAmount: loan ? parseFloat(loan.instal_amt as any) || 0 : 0,
        }));
    }, [activeLoans]);

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
                    paymentMonth: form.paymentMonth,
                    paymentYear: form.paymentYear,
                    paymentAmount: form.paymentAmount,
                    receiptNo: form.receiptNo,
                    narration: form.narration,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Repayment failed');
            setMessage({ type: 'success', text: data.message });
            // Refresh loans and history after successful repayment
            await fetchMemberLoans(form.mbno);
            await fetchRepaymentHistory(form.mbno);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setForm(defaultForm);
        setActiveLoans([]);
        setRepaymentHistory([]);
        setMessage(null);
    };

    return {
        form,
        activeLoans,
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

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

export interface ClosureUnpaidInstallment {
    installmentNo: number;
    dueDate: string;
    principalDue: number;
    interestDue: number;
    penalDue: number;
    monthsOverdue: number;
}

export interface ClosureQuote {
    loanCaseNo: string;
    closureDate: string;
    outstandingPrincipal: number;
    actualInterestToDate: number;
    daysSinceLastDue: number;
    previousOverdueInterest: number;
    penalInterest: number;
    adjustment: number;
    finalClosureAmount: number;
    unpaidInstallments: ClosureUnpaidInstallment[];
}

export interface ClosureForm {
    mbno: string;
    memberName: string;
    selectedLoanCase: string;
    adjustment: number;
    receiptNo: string;
}

const defaultForm: ClosureForm = {
    mbno: '',
    memberName: '',
    selectedLoanCase: '',
    adjustment: 0,
    receiptNo: '',
};

export const useLoanEarlyClosure = () => {
    const [form, setForm] = useState<ClosureForm>(defaultForm);
    const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
    const [quote, setQuote] = useState<ClosureQuote | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [closed, setClosed] = useState(false);

    const updateForm = <K extends keyof ClosureForm>(key: K, value: ClosureForm[K]) => {
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

    const fetchQuote = useCallback(async (loancaseno: string, adjustment: number) => {
        if (!loancaseno) return;
        setQuoteLoading(true);
        setMessage(null);
        try {
            const base = await getApiBaseUrl();
            const qs = adjustment ? `?adjustment=${encodeURIComponent(adjustment)}` : '';
            const res = await fetch(`${base}/loans/case/${loancaseno}/early-closure${qs}`);
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
        setForm(prev => ({ ...prev, mbno, memberName, selectedLoanCase: '', adjustment: 0 }));
        setQuote(null);
        setClosed(false);
        await fetchMemberLoans(mbno);
    }, [fetchMemberLoans]);

    const handleLoanSelect = useCallback(async (loancaseno: string) => {
        setForm(prev => ({ ...prev, selectedLoanCase: loancaseno, adjustment: 0 }));
        setClosed(false);
        await fetchQuote(loancaseno, 0);
    }, [fetchQuote]);

    const recalculate = useCallback(async () => {
        if (form.selectedLoanCase) await fetchQuote(form.selectedLoanCase, form.adjustment);
    }, [form.selectedLoanCase, form.adjustment, fetchQuote]);

    const handleExecuteClosure = async () => {
        if (!form.selectedLoanCase || !quote) return;
        setLoading(true);
        setMessage(null);
        try {
            const base = await getApiBaseUrl();
            const res = await fetch(`${base}/loans/case/${form.selectedLoanCase}/early-closure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adjustment: form.adjustment,
                    receiptNo: form.receiptNo,
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
        updateForm,
        handleMemberLookup,
        handleLoanSelect,
        recalculate,
        handleExecuteClosure,
        handleReset,
    };
};

import { useState, useCallback } from 'react';
import { getApiBaseUrl } from '../../../../../services/serverConfig';

export interface ActiveLoan {
    loancaseno: string;
    loantype: string;
    loan_amt: number;
    balance: number;
    no_of_instal: number;
    instal_amt: number;
}

export interface StatementRow {
    id: number;
    loancaseno: string;
    loantype: string;
    payment_date: string;
    payment_month: number;
    payment_year: number;
    due_date: string | null;
    payment_amount: number;
    principal_amount: number;
    interest_amount: number;
    penal_amount: number;
    months_overdue: number;
    receipt_no: string | null;
    narration: string;
    remaining_balance: number;
}

export interface LoanSummary {
    loancaseno: string;
    loantype: string;
    sanctioned_amount: number;
    current_balance: number;
    total_installments: number;
    emi_amount: number;
    total_paid: number;
    total_principal_paid: number;
    total_interest_paid: number;
    total_penal_paid: number;
    payments_made: number;
}

export const useLoanStatement = () => {
    const [mbno, setMbno] = useState('');
    const [memberName, setMemberName] = useState('');
    const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
    const [selectedLoanCase, setSelectedLoanCase] = useState('');
    const [rows, setRows] = useState<StatementRow[]>([]);
    const [summary, setSummary] = useState<LoanSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchMemberLoans = useCallback(async (memberNo: string, name: string) => {
        setMbno(memberNo);
        setMemberName(name);
        setSelectedLoanCase('');
        setRows([]);
        setSummary(null);
        setMessage(null);
        if (!memberNo) return;
        setLoading(true);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${base}/loans/member/${memberNo}/master`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error('Member not found or no loans on record');
            const data = await res.json();
            const loans: ActiveLoan[] = data.data || data || [];
            setActiveLoans(loans);
            if (loans.length === 0) setMessage({ type: 'error', text: 'No loans found for this member.' });
        } catch (err: any) {
            setActiveLoans([]);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    const selectLoanCase = useCallback(async (loancaseno: string) => {
        setSelectedLoanCase(loancaseno);
        setRows([]);
        setSummary(null);
        if (!loancaseno || !mbno) return;
        setLoading(true);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            const [historyRes, summaryRes] = await Promise.all([
                fetch(`${base}/loans/member/${mbno}/repayment-history`, { headers: authHeaders }),
                fetch(`${base}/loans/case/${loancaseno}/repayment-summary`, { headers: authHeaders }),
            ]);
            const historyData = await historyRes.json();
            const summaryData = await summaryRes.json();
            const allRows: StatementRow[] = historyData.data || historyData || [];
            // The API returns newest-first (for a "recent activity" list elsewhere);
            // this statement is a running ledger, so it needs oldest-first — matching
            // the "oldest first is at the top" caption and the remaining_balance the
            // backend already computes in chronological (ascending id) order.
            setRows(allRows.filter(r => r.loancaseno === loancaseno).sort((a, b) => a.id - b.id));
            setSummary(summaryData.data || summaryData || null);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    }, [mbno]);

    const reset = useCallback(() => {
        setMbno('');
        setMemberName('');
        setActiveLoans([]);
        setSelectedLoanCase('');
        setRows([]);
        setSummary(null);
        setMessage(null);
    }, []);

    return {
        mbno, memberName, activeLoans, selectedLoanCase, rows, summary, loading, message,
        fetchMemberLoans, selectLoanCase, reset,
    };
};

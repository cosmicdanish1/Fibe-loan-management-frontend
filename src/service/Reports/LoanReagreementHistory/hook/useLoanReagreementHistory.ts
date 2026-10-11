import { useCallback, useState } from 'react';
import apiService from '../../../../services/api';
import { ReagreementHistory, reagreementApi } from '../../../../services/reagreementApi';

export interface MemberLoanRow {
    loancaseno: string; loantype: string; loan_amt?: number; balance: number; consolidatedIntoLoancaseno?: string | null;
}

export const useLoanReagreementHistory = () => {
    const [mbno, setMbno] = useState('');
    const [memberName, setMemberName] = useState('');
    const [memberLoans, setMemberLoans] = useState<MemberLoanRow[]>([]);
    const [caseNo, setCaseNo] = useState('');
    const [loantype, setLoantype] = useState('');
    const [history, setHistory] = useState<ReagreementHistory | null>(null);
    const [logs, setLogs] = useState<Record<number, any[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const loadHistory = useCallback(async (no: string, cn: string, lt?: string) => {
        if (!no || !cn) return;
        setLoading(true); setError(null); setNotice(null); setLogs({});
        try {
            const h = await reagreementApi.history(no, cn, lt || undefined);
            setHistory(h);
            if (h.reagreements.length === 0) setNotice('This loan has never been re-agreed.');
        } catch (e: any) {
            setHistory(null); setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMemberLoans = useCallback(async (no: string) => {
        try {
            const res = await apiService.request<any>(`/loans/member/${encodeURIComponent(no)}/master`);
            const rows: MemberLoanRow[] = (res.success ? (res.data || []) : []).map((r: any) => ({
                loancaseno: String(r.loancaseno), loantype: r.loantype, loan_amt: Number(r.loan_amt), balance: Number(r.balance),
                consolidatedIntoLoancaseno: r.consolidatedIntoLoancaseno ?? null,
            }));
            setMemberLoans(rows);
            if (rows.length === 0) setError('No loans found for this member.');
        } catch (e: any) {
            setMemberLoans([]); setError(e.message);
        }
    }, []);

    const handleMemberLookup = useCallback(async (no: string, name: string) => {
        setMbno(no); setMemberName(name); setHistory(null); setError(null); setNotice(null); setCaseNo(''); setLoantype('');
        if (!no) return;
        await fetchMemberLoans(no);
    }, [fetchMemberLoans]);

    const selectCase = useCallback(async (row: MemberLoanRow) => {
        setCaseNo(row.loancaseno); setLoantype(row.loantype);
        await loadHistory(mbno, row.loancaseno, row.loantype);
    }, [mbno, loadHistory]);

    const showLog = useCallback(async (id: number) => {
        if (logs[id]) { setLogs(prev => { const c = { ...prev }; delete c[id]; return c; }); return; }
        try { const l = await reagreementApi.log(id); setLogs(prev => ({ ...prev, [id]: l })); } catch (e: any) { setError(e.message); }
    }, [logs]);

    const reverse = useCallback(async (voucherNo: string) => {
        setError(null); setNotice(null);
        try {
            await reagreementApi.reverse(voucherNo);
            setNotice(`Voucher ${voucherNo} reversed: the new case is removed and the old case is active again. The re-agreement is back at "Voucher created" in Pass Transactions.`);
            await loadHistory(mbno, caseNo, loantype);
            await fetchMemberLoans(mbno); // the loans list must reflect the restored / removed case
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        }
    }, [mbno, caseNo, loantype, loadHistory, fetchMemberLoans]);

    const reset = useCallback(() => {
        setMbno(''); setMemberName(''); setMemberLoans([]); setCaseNo(''); setLoantype(''); setHistory(null); setError(null); setNotice(null); setLogs({});
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) (window as any).electron.ipcRenderer.send('window-close');
    }, []);

    return {
        mbno, setMbno, memberName, memberLoans, caseNo, setCaseNo, loantype, history, logs, loading, error, notice,
        handleMemberLookup, selectCase, loadHistory, showLog, reverse, reset, handleExit,
    };
};

export type LoanReagreementHistoryHook = ReturnType<typeof useLoanReagreementHistory>;

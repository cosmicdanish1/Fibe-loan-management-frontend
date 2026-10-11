import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
    ActiveLoanRow, ReagreementDto, ReagreementQuote, reagreementApi,
} from '../../../../services/reagreementApi';

export interface ReagreementForm {
    tenure: string;
    rate: string;
    applicationDate: string; // YYYY-MM-DD
    reason: string;
}

export interface AppliedResult {
    id: number; reagreementNo: string; newLoanCaseNo: string; oldLoanCaseNo: string;
}

const todayIso = () => dayjs().format('YYYY-MM-DD');

/** All figures come from the server (POST /loans/reagreement/quote). This hook only sends the
 *  user's inputs — tenure, rate, application date — and keeps the latest answer. */
export const useLoanReagreement = () => {
    const [mbno, setMbno] = useState('');
    const [memberName, setMemberName] = useState('');
    const [loans, setLoans] = useState<ActiveLoanRow[]>([]);
    const [openList, setOpenList] = useState<ReagreementDto[]>([]);
    const [selected, setSelected] = useState<ActiveLoanRow | null>(null);
    const [form, setForm] = useState<ReagreementForm>({ tenure: '', rate: '', applicationDate: todayIso(), reason: '' });
    const [quote, setQuote] = useState<ReagreementQuote | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [loadingLoans, setLoadingLoans] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [applied, setApplied] = useState<AppliedResult | null>(null);
    const seq = useRef(0);

    const updateForm = useCallback(<K extends keyof ReagreementForm>(key: K, value: ReagreementForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setApplied(null);
    }, []);

    const refreshMember = useCallback(async (no: string) => {
        if (!no) return;
        setLoadingLoans(true);
        try {
            const [al, open] = await Promise.all([reagreementApi.activeLoans(no), reagreementApi.listOpen(no)]);
            setLoans(al.loans);
            setMemberName(al.memberName || '');
            setOpenList(open);
            if (al.loans.length === 0) setMessage({ type: 'error', text: 'This member has no active loan that can be re-agreed.' });
        } catch (e: any) {
            setLoans([]); setOpenList([]);
            setMessage({ type: 'error', text: e.message });
        } finally {
            setLoadingLoans(false);
        }
    }, []);

    const handleMemberLookup = useCallback(async (no: string, name: string) => {
        setMbno(no); setMemberName(name);
        setSelected(null); setQuote(null); setApplied(null); setMessage(null);
        await refreshMember(no);
    }, [refreshMember]);

    const selectLoan = useCallback((loan: ActiveLoanRow) => {
        setSelected(loan);
        setApplied(null); setMessage(null);
        setForm(prev => ({
            ...prev, tenure: String(loan.installments || ''), rate: String(loan.rate ?? ''), applicationDate: todayIso(), reason: '',
        }));
    }, []);

    // live quote — debounced; the server is the only place that does arithmetic
    useEffect(() => {
        if (!selected || selected.openReagreement) { setQuote(null); return; }
        const n = Number(form.tenure), r = Number(form.rate);
        if (!form.tenure || !form.rate || !Number.isFinite(n) || !Number.isFinite(r)) { setQuote(null); return; }
        const my = ++seq.current;
        setQuoteLoading(true);
        const t = setTimeout(async () => {
            try {
                const q = await reagreementApi.quote({
                    mbno, loancaseno: selected.loanCaseNo, loantype: selected.loanType,
                    newInstallments: n, newRate: r, applicationDate: form.applicationDate || undefined,
                });
                if (my === seq.current) setQuote(q);
            } catch (e: any) {
                if (my === seq.current) { setQuote(null); setMessage({ type: 'error', text: e.message }); }
            } finally {
                if (my === seq.current) setQuoteLoading(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [selected, mbno, form.tenure, form.rate, form.applicationDate]);

    const fieldError = (field: 'tenure' | 'rate' | 'applicationDate'): string | null =>
        quote?.errors.find(e => e.field === field)?.message ?? null;

    const canApply = !!selected && !selected.openReagreement && !!quote?.valid && !quoteLoading && !saving;

    const apply = useCallback(async () => {
        if (!selected || !quote?.valid) return false;
        setSaving(true); setMessage(null);
        try {
            const res = await reagreementApi.apply({
                mbno, loancaseno: selected.loanCaseNo, loantype: selected.loanType,
                newInstallments: Number(form.tenure), newRate: Number(form.rate),
                applicationDate: form.applicationDate || undefined, reason: form.reason,
            });
            setApplied({ id: res.id, reagreementNo: res.reagreementNo, newLoanCaseNo: res.newLoanCaseNo, oldLoanCaseNo: res.oldLoanCaseNo });
            setMessage({ type: 'success', text: `Re-agreement ${res.reagreementNo} applied. New loan case ${res.newLoanCaseNo} is pending. Next: open Loan Payment, select case ${res.newLoanCaseNo}, sanction it, then save the voucher and pass it in Pass Transactions.` });
            setSelected(null); setQuote(null);
            await refreshMember(mbno);
            return true;
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
            return false;
        } finally {
            setSaving(false);
        }
    }, [selected, quote, mbno, form, refreshMember]);

    const cancelOpen = useCallback(async (r: ReagreementDto, reason: string) => {
        setMessage(null);
        try {
            await reagreementApi.cancel(r.id, reason);
            setMessage({ type: 'success', text: `Re-agreement ${r.reagreementNo} cancelled.` });
            await refreshMember(mbno);
            return true;
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
            return false;
        }
    }, [mbno, refreshMember]);

    const handleReset = useCallback(() => {
        setMbno(''); setMemberName(''); setLoans([]); setOpenList([]); setSelected(null); setQuote(null);
        setApplied(null); setMessage(null);
        setForm({ tenure: '', rate: '', applicationDate: todayIso(), reason: '' });
    }, []);

    const handleExit = useCallback(() => {
        if ((window as any).electron?.ipcRenderer) (window as any).electron.ipcRenderer.send('window-close');
    }, []);

    return {
        mbno, setMbno, memberName, loans, openList, selected, form, quote, quoteLoading, loadingLoans, saving, message, applied,
        updateForm, handleMemberLookup, selectLoan, fieldError, canApply, apply, cancelOpen, handleReset, handleExit,
    };
};

export type LoanReagreementHook = ReturnType<typeof useLoanReagreement>;

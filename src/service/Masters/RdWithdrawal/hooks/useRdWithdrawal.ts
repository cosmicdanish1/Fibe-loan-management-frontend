import { useState, useCallback, useRef } from 'react';
import apiService from '../../../../services/api';

export interface RdBalanceEventRow {
    id: number;
    eventDate: string;
    eventType: string;
    amount: number;
    resultingBalance: number;
    narration: string | null;
}

export const useRdWithdrawal = () => {
    const [mbno, setMbno] = useState('');
    const [memberName, setMemberName] = useState('');
    const [yearcode, setYearcode] = useState<number | null>(null);
    const [yearLabel, setYearLabel] = useState('');
    const [balance, setBalance] = useState<number | null>(null);
    const [maxWithdrawable, setMaxWithdrawable] = useState<number | null>(null);
    const [amount, setAmount] = useState<number>(0);
    const [narration, setNarration] = useState('Withdrawal');
    const [timeline, setTimeline] = useState<RdBalanceEventRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadSeq = useRef(0);
    const savingRef = useRef(false);

    const loadFinancialYear = useCallback(async (): Promise<number | null> => {
        const res = await apiService.getCurrentFinancialYear();
        const fy = res.success ? (res.data?.data ?? res.data) : null;
        if (fy?.yearCode) {
            setYearcode(fy.yearCode);
            setYearLabel(
                `FY ${new Date(fy.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – ${new Date(fy.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
            );
            return fy.yearCode;
        }
        return null;
    }, []);

    // keepMessage = true only for the internal refresh after a withdrawal (so its success message survives)
    const loadMember = useCallback(async (memberNo: string, name: string, yc?: number | null, keepMessage = false) => {
        const seq = ++loadSeq.current;
        setMbno(memberNo);
        setMemberName(name);
        if (!keepMessage) {
            setMessage(null);
            // never leave the previous member's balance/timeline under the new member
            setBalance(null);
            setMaxWithdrawable(null);
            setTimeline([]);
            setAmount(0);
        }
        const year = yc ?? yearcode ?? (await loadFinancialYear());
        if (seq !== loadSeq.current) return;
        if (!year) return;

        setLoading(true);
        try {
            const [bal, tl] = await Promise.all([
                apiService.getRdCurrentBalance(memberNo, year),
                apiService.getRdBalanceTimeline(memberNo, year),
            ]);
            if (seq !== loadSeq.current) return;
            if (!bal.success) {
                setBalance(null);
                setMaxWithdrawable(null);
                setTimeline([]);
                setAmount(0);
                setMessage({ type: 'error', text: bal.message || 'Failed to load the RD balance.' });
                return;
            }
            setBalance(bal.data?.balance ?? 0);
            setMaxWithdrawable(bal.data?.maxWithdrawable ?? 0);
            setTimeline(tl.success && Array.isArray(tl.data) ? tl.data : []);
            setAmount(0);
        } catch (err: any) {
            if (seq !== loadSeq.current) return;
            setBalance(null);
            setMaxWithdrawable(null);
            setTimeline([]);
            setAmount(0);
            setMessage({ type: 'error', text: err?.message || 'Failed to load the RD balance.' });
        } finally {
            if (seq === loadSeq.current) setLoading(false);
        }
    }, [yearcode, loadFinancialYear]);

    const withdraw = useCallback(async () => {
        if (savingRef.current) return;
        if (!mbno || !yearcode || amount <= 0) return;
        savingRef.current = true;
        setSaving(true);
        setMessage(null);
        try {
            const res = await apiService.withdrawRd(mbno, yearcode, amount, narration);
            if (res.success) {
                setMessage({ type: 'success', text: res.message || 'Withdrawal recorded.' });
                await loadMember(mbno, memberName, yearcode, true);
            } else {
                setMessage({ type: 'error', text: res.message || 'Withdrawal failed.' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Withdrawal failed.' });
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }, [mbno, yearcode, amount, narration, memberName, loadMember]);

    return {
        mbno, memberName, yearLabel,
        balance, maxWithdrawable, amount, setAmount, narration, setNarration,
        timeline, loading, saving, message,
        loadFinancialYear, loadMember, withdraw,
    };
};

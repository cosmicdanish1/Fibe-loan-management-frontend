import { useState, useCallback } from 'react';
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

    const loadMember = useCallback(async (memberNo: string, name: string, yc?: number | null) => {
        setMbno(memberNo);
        setMemberName(name);
        setMessage(null);
        const year = yc ?? yearcode ?? (await loadFinancialYear());
        if (!year) return;

        setLoading(true);
        try {
            const [bal, tl] = await Promise.all([
                apiService.getRdCurrentBalance(memberNo, year),
                apiService.getRdBalanceTimeline(memberNo, year),
            ]);
            setBalance(bal.success ? bal.data?.balance ?? 0 : 0);
            setMaxWithdrawable(bal.success ? bal.data?.maxWithdrawable ?? 0 : 0);
            setTimeline(tl.success ? tl.data ?? [] : []);
            setAmount(0);
        } finally {
            setLoading(false);
        }
    }, [yearcode, loadFinancialYear]);

    const withdraw = useCallback(async () => {
        if (!mbno || !yearcode || amount <= 0) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await apiService.withdrawRd(mbno, yearcode, amount, narration);
            if (res.success) {
                setMessage({ type: 'success', text: res.message || 'Withdrawal recorded.' });
                await loadMember(mbno, memberName, yearcode);
            } else {
                setMessage({ type: 'error', text: res.message || 'Withdrawal failed.' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Withdrawal failed.' });
        } finally {
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

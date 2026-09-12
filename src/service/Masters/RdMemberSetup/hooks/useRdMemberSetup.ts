import { useState, useCallback } from 'react';
import apiService from '../../../../services/api';

export interface RdHistoryRow {
    id: number;
    monthlyRdAmount: number;
    effectiveFromDate: string;
    setBy: string | null;
    createdAt: string;
}

export const useRdMemberSetup = () => {
    const [mbno, setMbno] = useState('');
    const [memberName, setMemberName] = useState('');
    const [yearcode, setYearcode] = useState<number | null>(null);
    const [yearLabel, setYearLabel] = useState('');
    const [currentAmount, setCurrentAmount] = useState<number | null>(null);
    const [newAmount, setNewAmount] = useState<number>(0);
    const [history, setHistory] = useState<RdHistoryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const loadFinancialYear = useCallback(async (): Promise<number | null> => {
        const res = await apiService.getCurrentFinancialYear();
        // FinancialYear entity uses yearCode (capital C) — @PrimaryColumn({name:'yearcode'}) yearCode.
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
            const [cur, hist] = await Promise.all([
                apiService.getRdCurrentAmount(memberNo, year),
                apiService.getRdAmountHistory(memberNo, year),
            ]);
            setCurrentAmount(cur.success ? cur.data?.monthlyRdAmount ?? 0 : 0);
            setNewAmount(cur.success ? cur.data?.monthlyRdAmount ?? 0 : 0);
            setHistory(hist.success ? hist.data ?? [] : []);
        } finally {
            setLoading(false);
        }
    }, [yearcode, loadFinancialYear]);

    const save = useCallback(async () => {
        if (!mbno || !yearcode) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await apiService.setRdMonthlyAmount(mbno, yearcode, newAmount);
            if (res.success) {
                setMessage({ type: 'success', text: 'Monthly RD amount saved.' });
                await loadMember(mbno, memberName, yearcode);
            } else {
                setMessage({ type: 'error', text: res.message || 'Save failed.' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Save failed.' });
        } finally {
            setSaving(false);
        }
    }, [mbno, yearcode, newAmount, memberName, loadMember]);

    return {
        mbno, memberName, yearcode, yearLabel,
        currentAmount, newAmount, setNewAmount,
        history, loading, saving, message,
        loadFinancialYear, loadMember, save,
    };
};

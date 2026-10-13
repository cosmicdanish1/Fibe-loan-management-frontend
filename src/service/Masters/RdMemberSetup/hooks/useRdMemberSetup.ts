import { useState, useCallback, useRef } from 'react';
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

    const loadSeq = useRef(0);
    const savingRef = useRef(false);

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

    // keepMessage = true only for the internal refresh after a save (so its success message survives)
    const loadMember = useCallback(async (memberNo: string, name: string, yc?: number | null, keepMessage = false) => {
        const seq = ++loadSeq.current;
        setMbno(memberNo);
        setMemberName(name);
        if (!keepMessage) {
            setMessage(null);
            // never leave the previous member's amounts/history under the new member
            setCurrentAmount(null);
            setNewAmount(0);
            setHistory([]);
        }
        const year = yc ?? yearcode ?? (await loadFinancialYear());
        if (seq !== loadSeq.current) return;
        if (!year) return;

        setLoading(true);
        try {
            const [cur, hist] = await Promise.all([
                apiService.getRdCurrentAmount(memberNo, year),
                apiService.getRdAmountHistory(memberNo, year),
            ]);
            if (seq !== loadSeq.current) return;
            if (!cur.success) {
                setCurrentAmount(null);
                setNewAmount(0);
                setHistory([]);
                setMessage({ type: 'error', text: cur.message || 'Failed to load the monthly RD amount.' });
                return;
            }
            setCurrentAmount(cur.data?.monthlyRdAmount ?? 0);
            setNewAmount(cur.data?.monthlyRdAmount ?? 0);
            setHistory(hist.success && Array.isArray(hist.data) ? hist.data : []);
        } catch (err: any) {
            if (seq !== loadSeq.current) return;
            setCurrentAmount(null);
            setNewAmount(0);
            setHistory([]);
            setMessage({ type: 'error', text: err?.message || 'Failed to load the monthly RD amount.' });
        } finally {
            if (seq === loadSeq.current) setLoading(false);
        }
    }, [yearcode, loadFinancialYear]);

    const save = useCallback(async () => {
        if (savingRef.current) return;
        if (!mbno || !yearcode) return;
        savingRef.current = true;
        setSaving(true);
        setMessage(null);
        try {
            const res = await apiService.setRdMonthlyAmount(mbno, yearcode, newAmount);
            if (res.success) {
                setMessage({ type: 'success', text: 'Monthly RD amount saved.' });
                await loadMember(mbno, memberName, yearcode, true);
            } else {
                setMessage({ type: 'error', text: res.message || 'Save failed.' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Save failed.' });
        } finally {
            savingRef.current = false;
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

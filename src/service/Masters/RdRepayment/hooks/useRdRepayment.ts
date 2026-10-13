import { useState, useCallback, useRef } from 'react';
import apiService from '../../../../services/api';

export interface RdPendingInstallmentRow {
    installmentMonth: number;
    installmentYear: number;
    dueDate: string;
    expectedAmount: number;
    paidAmount: number;
    paidDate: string | null;
    status: 'PAID' | 'PARTIAL' | 'UNPAID';
}

export const useRdRepayment = () => {
    const [mbno, setMbno] = useState('');
    const [memberName, setMemberName] = useState('');
    const [yearcode, setYearcode] = useState<number | null>(null);
    const [yearLabel, setYearLabel] = useState('');
    const [months, setMonths] = useState<RdPendingInstallmentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Request-sequence guard (stale member lookups ignored) and in-flight guard for recording
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

    // keepMessage = true only for the internal refresh after a save (so its success message survives)
    const loadMember = useCallback(async (memberNo: string, name: string, yc?: number | null, keepMessage = false) => {
        const seq = ++loadSeq.current;
        setMbno(memberNo);
        setMemberName(name);
        if (!keepMessage) {
            setMessage(null);
            setMonths([]); // never leave the previous member's months under the new member
        }
        const year = yc ?? yearcode ?? (await loadFinancialYear());
        if (seq !== loadSeq.current) return;
        if (!year) { setMonths([]); return; }

        setLoading(true);
        try {
            const res = await apiService.getRdPendingInstallments(memberNo, year);
            if (seq !== loadSeq.current) return;
            setMonths(res.success && Array.isArray(res.data) ? res.data : []);
            if (!res.success) setMessage({ type: 'error', text: res.message || 'Failed to load RD installments.' });
        } catch (err: any) {
            if (seq !== loadSeq.current) return;
            setMonths([]);
            setMessage({ type: 'error', text: err?.message || 'Failed to load RD installments.' });
        } finally {
            if (seq === loadSeq.current) setLoading(false);
        }
    }, [yearcode, loadFinancialYear]);

    const recordPayment = useCallback(async (
        installmentMonth: number,
        installmentYear: number,
        amount: number,
        recordedBy: string,
        narration?: string,
    ): Promise<boolean> => {
        if (savingRef.current) return false;
        if (!mbno || !yearcode || amount <= 0) return false;
        if (!recordedBy) {
            setMessage({ type: 'error', text: 'Logged-in user not found - please sign in again.' });
            return false;
        }
        savingRef.current = true;
        setSaving(true);
        setMessage(null);
        try {
            const res = await apiService.recordRdRepayment(mbno, yearcode, installmentMonth, installmentYear, amount, recordedBy, narration);
            if (res.success) {
                setMessage({ type: 'success', text: res.message || 'Payment recorded.' });
                await loadMember(mbno, memberName, yearcode, true);
                return true;
            }
            setMessage({ type: 'error', text: res.message || 'Failed to record payment.' });
            return false;
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to record payment.' });
            return false;
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }, [mbno, yearcode, memberName, loadMember]);

    return {
        mbno, memberName, yearLabel,
        months, loading, saving, message,
        loadFinancialYear, loadMember, recordPayment,
    };
};

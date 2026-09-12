import { useState, useCallback } from 'react';
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
            const res = await apiService.getRdPendingInstallments(memberNo, year);
            setMonths(res.success ? res.data ?? [] : []);
        } finally {
            setLoading(false);
        }
    }, [yearcode, loadFinancialYear]);

    const recordPayment = useCallback(async (
        installmentMonth: number,
        installmentYear: number,
        amount: number,
        recordedBy: string,
        narration?: string,
    ) => {
        if (!mbno || !yearcode || amount <= 0) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await apiService.recordRdRepayment(mbno, yearcode, installmentMonth, installmentYear, amount, recordedBy, narration);
            if (res.success) {
                setMessage({ type: 'success', text: res.message || 'Payment recorded.' });
                await loadMember(mbno, memberName, yearcode);
            } else {
                setMessage({ type: 'error', text: res.message || 'Failed to record payment.' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to record payment.' });
        } finally {
            setSaving(false);
        }
    }, [mbno, yearcode, memberName, loadMember]);

    return {
        mbno, memberName, yearLabel,
        months, loading, saving, message,
        loadFinancialYear, loadMember, recordPayment,
    };
};

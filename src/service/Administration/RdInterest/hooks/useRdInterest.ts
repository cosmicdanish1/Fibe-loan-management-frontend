import { useState, useCallback, useRef } from 'react';
import apiService from '../../../../services/api';

export type RdDecisionChoice = 'ALLOW' | 'DENY';

export interface RdExplainMonth {
    label: string;
    dueDate: string;
    paidDate: string | null;
    amount: number;
    status: 'ON_TIME' | 'LATE' | 'MISSED' | 'NOT_POSTED';
    allowed: { months: number; interest: number };
    denied: { months: number; interest: number };
}

export interface RdExplain {
    mbno: string;
    memberName: string;
    yearcode: number | null;
    /** a past financial year, shown read-only (nothing can be saved or posted) */
    historic?: boolean;
    legacyPosted?: { amount: number; date: string | null; difference: number };
    fyStart: string;
    fyEnd: string;
    rate: number;
    monthlyAmount: number | null;
    openingBalance: number;
    mode: 'INSTALMENTS' | 'LEDGER' | 'HISTORY';
    pattern: {
        code: string;
        label: string;
        summary: string;
        reasons: string[];
        totalDue: number;
        paidOnTime: number;
        paidLate: number;
        missed: number;
        longestGapMonths: number;
        maxConsecutiveOnTime: number;
    };
    months: RdExplainMonth[];
    openingInterest: number;
    openingBreakdown: {
        rate: number;
        periods: Array<{ from: string; to: string; balance: number; months: number; interest: number }>;
        withdrawals: Array<{ date: string; amount: number }>;
    };
    totals: { installmentAllowed: number; installmentDenied: number; totalAllowed: number; totalDenied: number };
    decision: {
        saved: RdDecisionChoice | null;
        reason: string | null;
        by: string | null;
        at: string | null;
        effective: RdDecisionChoice;
        source: 'SAVED' | 'AUTO' | 'DEFAULT';
        needsDecision: boolean;
    };
    autoPostingOn: boolean;
    closed: { totalInterestCredited: number; closedAt: string; closedBy: string } | null;
}

const unwrap = (res: any) => (res?.data?.data ?? res?.data);

export const useRdInterest = () => {
    const [yearcode, setYearcode] = useState<number | null>(null);
    const [yearLabel, setYearLabel] = useState('');
    const [data, setData] = useState<RdExplain | null>(null);
    const [historyYears, setHistoryYears] = useState<Array<{ fyStartYear: number; label: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const seq = useRef(0);
    const busy = useRef(false);

    const loadFinancialYear = useCallback(async (): Promise<number | null> => {
        const res = await apiService.getCurrentFinancialYear();
        const fy = res.success ? (res.data?.data ?? res.data) : null;
        if (fy?.yearCode) {
            setYearcode(fy.yearCode);
            setYearLabel(
                `FY ${new Date(fy.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – ${new Date(fy.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
            );
            return fy.yearCode as number;
        }
        return null;
    }, []);

    const loadHistoryYears = useCallback(async () => {
        try {
            const res = await apiService.getRdHistoryYears();
            if (res.success) setHistoryYears((unwrap(res) as any[]) ?? []);
        } catch { /* the list stays empty */ }
    }, []);

    /** Load a member: the current year (live, with the decision), or a past year (pass fyStartYear: read-only). */
    const load = useCallback(async (mbno: string, yc?: number | null, fyStartYear?: number | null) => {
        const member = String(mbno || '').trim();
        if (!member) return;
        const year = fyStartYear != null ? 0 : (yc ?? yearcode ?? (await loadFinancialYear()));
        if (fyStartYear == null && !year) { setMessage({ type: 'error', text: 'No financial year is open.' }); return; }
        const my = ++seq.current;
        setLoading(true);
        setMessage(null);
        try {
            const res = fyStartYear != null ? await apiService.explainRdInterestHistory(member, fyStartYear) : await apiService.explainRdInterest(member, year as number);
            if (my !== seq.current) return;
            if (res.success) setData(unwrap(res) as RdExplain);
            else { setData(null); setMessage({ type: 'error', text: res.message || 'Could not load this member.' }); }
        } catch (e: any) {
            if (my === seq.current) { setData(null); setMessage({ type: 'error', text: e?.message || 'Could not load this member.' }); }
        } finally {
            if (my === seq.current) setLoading(false);
        }
    }, [yearcode, loadFinancialYear]);

    /** Save the employee's decision (and optionally post the interest of the year for this member). */
    const decide = useCallback(async (choice: RdDecisionChoice, reason: string, post: boolean, closedBy: string): Promise<boolean> => {
        if (!data || data.yearcode == null || busy.current) return false;
        busy.current = true;
        setSaving(true);
        setMessage(null);
        try {
            const r1 = await apiService.setRdInterestDecision(data.mbno, data.yearcode as number, choice, reason);
            if (!r1.success) { setMessage({ type: 'error', text: r1.message || 'Could not save the decision.' }); return false; }
            if (post) {
                const r2 = await apiService.closeRdMemberYear(data.mbno, data.yearcode as number, closedBy);
                if (!r2.success) { setMessage({ type: 'error', text: r2.message || 'The decision was saved but the interest was not posted.' }); await load(data.mbno, data.yearcode as number); return false; }
                const out = unwrap(r2);
                setMessage({ type: 'success', text: `Posted ₹${Number(out?.totalInterestCredited ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} to the RD/CD of member ${data.mbno}${out?.interestVoucherNo ? ` (voucher ${out.interestVoucherNo})` : ''}.` });
            } else {
                setMessage({ type: 'success', text: `Decision saved: ${choice === 'ALLOW' ? 'Allow full interest' : 'Deny'}.` });
            }
            await load(data.mbno, data.yearcode as number);
            return true;
        } catch (e: any) {
            setMessage({ type: 'error', text: e?.message || 'Something went wrong.' });
            return false;
        } finally {
            busy.current = false;
            setSaving(false);
        }
    }, [data, load]);

    const clearDecision = useCallback(async () => {
        if (!data || data.yearcode == null || busy.current) return;
        busy.current = true;
        setSaving(true);
        try {
            const res = await apiService.clearRdInterestDecision(data.mbno, data.yearcode as number);
            if (!res.success) setMessage({ type: 'error', text: res.message || 'Could not clear the decision.' });
            else await load(data.mbno, data.yearcode as number);
        } finally {
            busy.current = false;
            setSaving(false);
        }
    }, [data, load]);

    return { yearcode, yearLabel, data, historyYears, loading, saving, message, setMessage, loadFinancialYear, loadHistoryYears, load, decide, clearDecision };
};

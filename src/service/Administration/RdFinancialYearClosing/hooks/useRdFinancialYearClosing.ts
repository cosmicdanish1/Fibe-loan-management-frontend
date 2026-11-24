import { useState, useCallback } from 'react';
import apiService from '../../../../services/api';

export interface RdClosingDecision {
    saved: 'ALLOW' | 'DENY' | null;
    reason: string | null;
    by: string | null;
    at: string | null;
    effective: 'ALLOW' | 'DENY';
    source: 'SAVED' | 'AUTO' | 'DEFAULT';
    needsDecision: boolean;
}

export interface RdClosingMemberRow {
    mbno: string;
    patternEvaluation: {
        totalDue: number;
        totalPaidOnTime: number;
        totalPaidLate: number;
        totalStillMissing: number;
        detectedPattern: string;
        autoEligibleFullInterest: boolean;
        disqualifyingReasons: string[];
    };
    installmentInterest: { totalInterest: number };
    openingBalanceInterest: { totalInterest: number };
    /** what will be posted (the decision that applies) */
    totalInterestIfClosedNow: number;
    currentBalance: number;
    /** ES-629: the total if the employee allows / denies */
    interestIfAllowed: number;
    interestIfDenied: number;
    patternLabel: string;
    decision: RdClosingDecision;
}

const PAGE_SIZE = 100;

export const useRdFinancialYearClosing = () => {
    const [yearcode, setYearcode] = useState<number | null>(null);
    const [yearLabel, setYearLabel] = useState('');
    const [members, setMembers] = useState<RdClosingMemberRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [closing, setClosing] = useState(false);
    const [busyMember, setBusyMember] = useState<string | null>(null);
    const [closeResult, setCloseResult] = useState<{ succeeded: any[]; failed: Array<{ mbno: string; error: string }> } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadFinancialYear = useCallback(async () => {
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

    const loadPage = useCallback(async (yc: number, pageIndex: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiService.previewRdClosingAll(yc, PAGE_SIZE, pageIndex * PAGE_SIZE);
            if (res.success) {
                setMembers(res.data?.members ?? []);
                setTotal(res.data?.total ?? 0);
                setPage(pageIndex);
            } else {
                setError(res.message || 'Failed to load members.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load members.');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadForYear = useCallback(async (yc?: number) => {
        const year = yc ?? yearcode ?? (await loadFinancialYear());
        if (!year) return;
        setCloseResult(null);
        await loadPage(year, 0);
    }, [yearcode, loadFinancialYear, loadPage]);

    /** Confirm Deny for one member from the list (Allow needs a reason, so it is done in the one-member window). */
    const denyMember = useCallback(async (mbno: string) => {
        if (!yearcode) return;
        setBusyMember(mbno);
        setError(null);
        try {
            const res = await apiService.setRdInterestDecision(mbno, yearcode, 'DENY', '');
            if (!res.success) setError(res.message || 'Could not save the decision.');
            else await loadPage(yearcode, page);
        } catch (err: any) {
            setError(err.message || 'Could not save the decision.');
        } finally {
            setBusyMember(null);
        }
    }, [yearcode, page, loadPage]);

    /** Close the year for every member: each one is posted with his saved decision, else the default (Deny, or Allow when fully regular). */
    const closeAll = useCallback(async (closedBy: string) => {
        if (!yearcode) return;
        setClosing(true);
        setError(null);
        try {
            const res = await apiService.closeRdFinancialYear(yearcode, closedBy);
            if (res.success) {
                setCloseResult(res.data ?? null);
                await loadPage(yearcode, page);
            } else {
                setError(res.message || 'Bulk closing failed.');
            }
        } catch (err: any) {
            setError(err.message || 'Bulk closing failed.');
        } finally {
            setClosing(false);
        }
    }, [yearcode, page, loadPage]);

    return {
        yearcode, yearLabel, members, total, page, pageSize: PAGE_SIZE,
        loading, closing, busyMember, closeResult, error,
        loadForYear, loadPage, denyMember, closeAll,
    };
};

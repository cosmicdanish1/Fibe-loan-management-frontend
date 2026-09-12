import { useState, useCallback } from 'react';
import apiService from '../../../../services/api';

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
    totalInterestIfClosedNow: number;
    currentBalance: number;
}

export interface OverrideEntry {
    eligible: boolean;
    reason: string;
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
    const [overrides, setOverrides] = useState<Record<string, OverrideEntry>>({});
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

    const setOverride = useCallback((mbno: string, entry: OverrideEntry | null) => {
        setOverrides((prev) => {
            const next = { ...prev };
            if (entry) next[mbno] = entry;
            else delete next[mbno];
            return next;
        });
    }, []);

    const closeOne = useCallback(async (mbno: string, closedBy: string) => {
        if (!yearcode) return;
        const override = overrides[mbno];
        const res = await apiService.closeRdMemberYear(mbno, yearcode, closedBy, override?.eligible, override?.reason);
        if (res.success) {
            await loadPage(yearcode, page);
        }
        return res;
    }, [yearcode, overrides, page, loadPage]);

    const closeAll = useCallback(async (closedBy: string) => {
        if (!yearcode) return;
        setClosing(true);
        setError(null);
        try {
            const overridesPayload: Record<string, { eligible: boolean; reason: string }> = {};
            for (const [mbno, o] of Object.entries(overrides)) overridesPayload[mbno] = o;
            const res = await apiService.closeRdFinancialYear(yearcode, closedBy, overridesPayload);
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
    }, [yearcode, overrides, page, loadPage]);

    return {
        yearcode, yearLabel, members, total, page, pageSize: PAGE_SIZE,
        loading, closing, overrides, closeResult, error,
        loadForYear, loadPage, setOverride, closeOne, closeAll,
    };
};

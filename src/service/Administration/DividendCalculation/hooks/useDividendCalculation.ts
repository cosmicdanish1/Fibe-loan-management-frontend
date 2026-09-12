import { useState, useCallback } from 'react';
import apiService from '../../../../services/api';

export interface DividendPreviewMember {
    mbno: string;
    memberName: string;
    totalProduct: number;
    monthsFound: number;
    monthsExpected: number;
    dividendRate: number;
    dividendAmount: number;
}

export interface DividendPreview {
    yearcode: number;
    calculationYear: number;
    dividendRatePercent: number;
    monthsExpected: number;
    members: DividendPreviewMember[];
}

export const useDividendCalculation = () => {
    const [yearcode, setYearcode] = useState<number>(1);
    const [dividendRate, setDividendRate] = useState<number>(10);
    const [preview, setPreview] = useState<DividendPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [commitResult, setCommitResult] = useState<{ success: boolean; calculationYear: number; membersCommitted: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [snapMonth, setSnapMonth] = useState<number>(new Date().getMonth() + 1);
    const [snapYear, setSnapYear] = useState<number>(new Date().getFullYear());
    const [snapshotting, setSnapshotting] = useState(false);
    const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);

    const loadPreview = useCallback(async (clearCommitResult: boolean = true) => {
        setLoading(true);
        setError(null);
        if (clearCommitResult) setCommitResult(null);
        try {
            const res = await apiService.previewDividendCalculation(yearcode, dividendRate);
            if (res.success) {
                setPreview(res.data ?? null);
            } else {
                setPreview(null);
                setError(res.message || 'Failed to load dividend preview.');
            }
        } catch (err: any) {
            setPreview(null);
            setError(err.message || 'Failed to load dividend preview.');
        } finally {
            setLoading(false);
        }
    }, [yearcode, dividendRate]);

    const commit = useCallback(async () => {
        setCommitting(true);
        setError(null);
        try {
            const res = await apiService.commitDividendCalculation(yearcode, dividendRate);
            if (res.success) {
                setCommitResult(res.data ?? null);
                await loadPreview(false);
            } else {
                setError(res.message || 'Failed to commit dividend calculation.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to commit dividend calculation.');
        } finally {
            setCommitting(false);
        }
    }, [yearcode, dividendRate, loadPreview]);

    const captureSnapshot = useCallback(async () => {
        setSnapshotting(true);
        setSnapshotMessage(null);
        try {
            const res = await apiService.captureShareMonthEndSnapshot(snapMonth, snapYear);
            if (res.success) {
                setSnapshotMessage(res.data?.message || `Captured snapshot for ${snapMonth}/${snapYear}.`);
            } else {
                setSnapshotMessage(res.message || 'Failed to capture snapshot.');
            }
        } catch (err: any) {
            setSnapshotMessage(err.message || 'Failed to capture snapshot.');
        } finally {
            setSnapshotting(false);
        }
    }, [snapMonth, snapYear]);

    return {
        yearcode, setYearcode, dividendRate, setDividendRate,
        preview, loading, committing, commitResult, error,
        loadPreview, commit,
        snapMonth, setSnapMonth, snapYear, setSnapYear, snapshotting, snapshotMessage, captureSnapshot,
    };
};

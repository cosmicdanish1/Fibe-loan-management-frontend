import { useState, useCallback } from 'react';
import apiService from '../../../../services/api';

export interface DividendCreditPreviewRow {
    mbno: string;
    memberName: string;
    dividendAmount: number;
    currentShareValue: number;
    newShareValue: number;
}

export interface DividendCreditPreview {
    creditYearcode: number;
    previousCalculationYear: number | null;
    members: DividendCreditPreviewRow[];
}

export interface DividendCreditResult {
    mbno: string;
    calculationYear: number;
    dividendAmount: number;
    newShareValue: number;
}

export const useDividendCredit = () => {
    const [yearcode, setYearcode] = useState<number>(1);
    const [preview, setPreview] = useState<DividendCreditPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [crediting, setCrediting] = useState(false);
    const [creditResult, setCreditResult] = useState<{ creditYearcode: number; credited: DividendCreditResult[]; failed: Array<{ mbno: string; error: string }> } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadPreview = useCallback(async (clearCreditResult: boolean = true) => {
        setLoading(true);
        setError(null);
        if (clearCreditResult) setCreditResult(null);
        try {
            const res = await apiService.previewDividendCredit(yearcode);
            if (res.success) {
                setPreview(res.data ?? null);
            } else {
                setPreview(null);
                setError(res.message || 'Failed to load dividend credit preview.');
            }
        } catch (err: any) {
            setPreview(null);
            setError(err.message || 'Failed to load dividend credit preview.');
        } finally {
            setLoading(false);
        }
    }, [yearcode]);

    const commit = useCallback(async (creditedBy: string) => {
        setCrediting(true);
        setError(null);
        try {
            const res = await apiService.commitDividendCredit(yearcode, creditedBy);
            if (res.success) {
                setCreditResult(res.data ?? null);
                await loadPreview(false);
            } else {
                setError(res.message || 'Failed to credit dividend.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to credit dividend.');
        } finally {
            setCrediting(false);
        }
    }, [yearcode, loadPreview]);

    return { yearcode, setYearcode, preview, loading, crediting, creditResult, error, loadPreview, commit };
};

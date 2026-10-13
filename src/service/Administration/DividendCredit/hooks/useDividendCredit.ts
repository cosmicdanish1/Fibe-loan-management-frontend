import { useState, useCallback, useRef } from 'react';
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
    const [yearcode, setYearcodeRaw] = useState<number>(1);
    const [preview, setPreview] = useState<DividendCreditPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [crediting, setCrediting] = useState(false);
    const [creditResult, setCreditResult] = useState<{ creditYearcode: number; credited: DividendCreditResult[]; failed: Array<{ mbno: string; error: string }> } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Sequence guard so a slow, older preview can never overwrite a newer one.
    const previewSeq = useRef(0);

    // The preview belongs to one year code - editing it invalidates the
    // preview so Credit cannot run for a year that was never previewed.
    const setYearcode = useCallback((v: number) => {
        previewSeq.current++;
        setPreview(null);
        setLoading(false);
        setYearcodeRaw(v);
    }, []);

    const loadPreview = useCallback(async (clearCreditResult: boolean = true) => {
        if (!Number.isInteger(yearcode) || yearcode <= 0) {
            setPreview(null);
            setError('Enter a valid closing year code.');
            return;
        }
        const seq = ++previewSeq.current;
        setLoading(true);
        setError(null);
        if (clearCreditResult !== false) setCreditResult(null);
        try {
            const res = await apiService.previewDividendCredit(yearcode);
            if (seq !== previewSeq.current) return;
            if (res.success) {
                setPreview(res.data ?? null);
            } else {
                setPreview(null);
                setError(res.message || 'Failed to load dividend credit preview.');
            }
        } catch (err: any) {
            if (seq !== previewSeq.current) return;
            setPreview(null);
            setError(err.message || 'Failed to load dividend credit preview.');
        } finally {
            if (seq === previewSeq.current) setLoading(false);
        }
    }, [yearcode]);

    const commit = useCallback(async (creditedBy: string) => {
        // Only credit the year that was previewed.
        if (!preview || Number(preview.creditYearcode) !== yearcode) {
            setError('Year code changed since the last preview. Click Preview again before crediting.');
            return;
        }
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
    }, [yearcode, loadPreview, preview]);

    return { yearcode, setYearcode, preview, loading, crediting, creditResult, error, loadPreview, commit };
};

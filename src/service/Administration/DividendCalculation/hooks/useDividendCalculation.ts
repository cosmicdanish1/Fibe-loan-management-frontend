import { useState, useCallback, useRef, useEffect } from 'react';
import apiService from '../../../../services/api';
import { friendlyError } from '@/utils/friendlyError';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
    const [yearcode, setYearcodeRaw] = useState<number>(1);
    // null = field left blank (must not silently become 0%)
    const [dividendRate, setDividendRateRaw] = useState<number | null>(10);
    // Fixed / Minimum / Maximum rate from Modify Business Rules (ES-476); only the ones switched on apply
    const [rateRules, setRateRules] = useState<{ fixed: { active: boolean; value: number }; min: { active: boolean; value: number }; max: { active: boolean; value: number }; payoutPercent: number } | null>(null);
    const [preview, setPreview] = useState<DividendPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [commitResult, setCommitResult] = useState<{ success: boolean; calculationYear: number; membersCommitted: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [snapMonth, setSnapMonth] = useState<number>(new Date().getMonth() + 1);
    const [snapYear, setSnapYear] = useState<number>(new Date().getFullYear());
    const [snapshotting, setSnapshotting] = useState(false);
    const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);

    // Sequence guard so a slow, older preview can never overwrite a newer one.
    const previewSeq = useRef(0);

    // The preview was computed for specific parameters - editing either one
    // invalidates it so Commit cannot run with values that were never previewed.
    const setYearcode = useCallback((v: number) => {
        previewSeq.current++;
        setPreview(null);
        setLoading(false);
        setYearcodeRaw(v);
    }, []);
    const setDividendRate = useCallback((v: number | null) => {
        previewSeq.current++;
        setPreview(null);
        setLoading(false);
        setDividendRateRaw(v);
    }, []);

    // Load the rules once; start from the fixed rate if there is one, else from Dividend Payout (%)
    useEffect(() => {
        let cancelled = false;
        apiService.getDividendRateRules().then((res) => {
            if (cancelled || !res.success || !res.data) return;
            const r = res.data;
            setRateRules(r);
            if (r.fixed?.active) setDividendRateRaw(r.fixed.value);
            else if (r.payoutPercent > 0) setDividendRateRaw(r.payoutPercent);
        });
        return () => { cancelled = true; };
    }, []);

    const validateParams = (): string | null => {
        if (!Number.isInteger(yearcode) || yearcode <= 0) return 'Enter a valid year code.';
        if (dividendRate === null || !Number.isFinite(dividendRate) || dividendRate <= 0 || dividendRate > 100) {
            return 'Dividend rate must be a number greater than 0 and at most 100.';
        }
        if (rateRules?.fixed.active && dividendRate !== rateRules.fixed.value) return `The dividend rate is fixed at ${rateRules.fixed.value}% in Business Rules.`;
        if (rateRules?.min.active && dividendRate < rateRules.min.value) return `The dividend rate cannot be below ${rateRules.min.value}% (Business Rules).`;
        if (rateRules?.max.active && dividendRate > rateRules.max.value) return `The dividend rate cannot be above ${rateRules.max.value}% (Business Rules).`;
        return null;
    };

    // `clearCommitResult` must be strictly `false` to keep the result; a click
    // event (if ever passed by mistake) is treated as the default (clear).
    const loadPreview = useCallback(async (clearCommitResult: boolean = true) => {
        const invalid = validateParams();
        if (invalid) {
            setPreview(null);
            setError(invalid);
            return;
        }
        const seq = ++previewSeq.current;
        setLoading(true);
        setError(null);
        if (clearCommitResult !== false) setCommitResult(null);
        try {
            const res = await apiService.previewDividendCalculation(yearcode, dividendRate as number);
            if (seq !== previewSeq.current) return;
            if (res.success) {
                setPreview(res.data ?? null);
            } else {
                setPreview(null);
                setError(friendlyError(res, 'load the dividend preview').lines.join(' '));
            }
        } catch (err: any) {
            if (seq !== previewSeq.current) return;
            setPreview(null);
            setError(err.message || 'Failed to load dividend preview.');
        } finally {
            if (seq === previewSeq.current) setLoading(false);
        }
    }, [yearcode, dividendRate]);

    const commit = useCallback(async () => {
        // Only commit exactly what was previewed.
        if (!preview || validateParams() || Number(preview.yearcode) !== yearcode || Number(preview.dividendRatePercent) !== dividendRate) {
            setError('Parameters changed since the last preview. Click Preview again before committing.');
            return;
        }
        setCommitting(true);
        setError(null);
        try {
            const res = await apiService.commitDividendCalculation(yearcode, dividendRate as number);
            if (res.success) {
                setCommitResult(res.data ?? null);
                await loadPreview(false);
            } else {
                setError(friendlyError(res, 'commit the dividend calculation').lines.join(' '));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to commit dividend calculation.');
        } finally {
            setCommitting(false);
        }
    }, [yearcode, dividendRate, loadPreview, preview]);

    const captureSnapshot = useCallback(async () => {
        setSnapshotting(true);
        setSnapshotMessage(null);
        try {
            const res = await apiService.captureShareMonthEndSnapshot(snapMonth, snapYear);
            if (res.success) {
                setSnapshotMessage(res.data?.message || t('Captured snapshot for {{1}}/{{2}}.', { 1: snapMonth, 2: snapYear }));
            } else {
                setSnapshotMessage(res.message || t('Failed to capture snapshot.'));
            }
        } catch (err: any) {
            setSnapshotMessage(err.message || t('Failed to capture snapshot.'));
        } finally {
            setSnapshotting(false);
        }
    }, [snapMonth, snapYear]);

    return {
        yearcode, setYearcode, dividendRate, setDividendRate, rateRules,
        preview, loading, committing, commitResult, error,
        loadPreview, commit,
        snapMonth, setSnapMonth, snapYear, setSnapYear, snapshotting, snapshotMessage, captureSnapshot,
    };
};

// hook/useGroupInsurance.ts
// Yearly Group Insurance (ES-98): a lump sum is split over the active members, late joiners pay only for the
// months left, and the amount is deducted from each member's RD at financial year end.
import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../../../services/api';

export interface FinancialYear {
  yearcode: number; label: string; fyStart: string; fyEnd: string; closed: boolean; run: RunInfo | null;
}

export interface RunInfo {
  id: number; yearcode: number; fyLabel: string; fyStart: string; fyEnd: string; lumpSum: number;
  activeMembers: number; perMemberAmount: number; postingDate: string;
  voucherNo: string; chargedMembers: number; totalCharged: number; status: string; createdBy: string; createdAt: string;
}

export interface ChargeRow {
  memberNo: string; name: string; joinDate?: string | null; months: number; calcAmount: number; charge: number;
  rdBefore: number; rdAfter: number; uncovered: number; retired?: boolean;
}

export interface PreviewSummary {
  activeMembers: number; membersCharged: number; divisor: number; perMemberYearly: number; totalToCollect: number;
  difference: number; partialYear: number; goesNegative: number; alreadyNegative: number; uncoveredTotal: number;
  retiredExcluded: number; joinsAfterYearEnd: number; noBalanceRow: number; duplicateNumbers: number;
}

export interface Preview {
  yearcode: number; fyLabel: string; fyStart: string; fyEnd: string; postingDate: string; lumpSum: number;
  summary: PreviewSummary; alreadyPosted: RunInfo | null; rows: ChargeRow[]; rowTotal: number; limit: number; offset: number;
}

export type RowFilter = 'all' | 'partial' | 'negative';
export const PAGE_SIZE = 100;

// TransformInterceptor can wrap a controller's { success, data } once more
const unwrap = (d: any): any => (d && typeof d === 'object' && !Array.isArray(d) && 'success' in d && 'data' in d ? d.data : d);

export const useGroupInsurance = () => {
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [yearcode, setYearcode] = useState<number | null>(null);
  const [lumpSum, setLumpSum] = useState('');
  const [postingDate, setPostingDate] = useState('');
  const [filter, setFilter] = useState<RowFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [loadingCtx, setLoadingCtx] = useState(true);
  const reqId = useRef(0);

  const loadContext = useCallback(async () => {
    setLoadingCtx(true);
    try {
      const res = await apiService.getGroupInsuranceContext();
      if (!res.success) throw new Error((res as any).message || 'Could not load financial years');
      const ctx = unwrap(res.data);
      const ys: FinancialYear[] = ctx.years || [];
      setYears(ys);
      setRuns(ys.map(y => y.run).filter(Boolean) as RunInfo[]);
      setYearcode(prev => prev ?? ctx.currentYearcode ?? ys[0]?.yearcode ?? null);
    } catch (e: any) {
      setError(e?.message || 'Could not load financial years');
    } finally {
      setLoadingCtx(false);
    }
  }, []);

  useEffect(() => { loadContext(); }, [loadContext]);

  // default posting date follows the chosen year (year end — insurance is deducted in March)
  useEffect(() => {
    const y = years.find(v => v.yearcode === yearcode);
    if (y) setPostingDate(y.fyEnd);
    setPreview(null); setPage(0);
  }, [yearcode, years]);

  const lumpNumber = Number(lumpSum);
  const canCalculate = yearcode != null && Number.isFinite(lumpNumber) && lumpNumber > 0;

  const calculate = useCallback(async (opts: { filter?: RowFilter; search?: string; page?: number } = {}) => {
    if (!canCalculate || yearcode == null) return;
    const id = ++reqId.current;
    setCalculating(true); setError('');
    const f = opts.filter ?? filter; const s = opts.search ?? search; const p = opts.page ?? page;
    try {
      const res = await apiService.previewGroupInsurance({
        yearcode, lumpSum: lumpNumber, postingDate: postingDate || undefined,
        filter: f, search: s.trim() || undefined, limit: PAGE_SIZE, offset: p * PAGE_SIZE,
      });
      if (id !== reqId.current) return;
      if (!res.success) throw new Error((res as any).message || 'Could not calculate');
      setPreview(unwrap(res.data) as Preview);
    } catch (e: any) {
      if (id !== reqId.current) return;
      setPreview(null);
      setError(e?.message || 'Could not calculate');
    } finally {
      if (id === reqId.current) setCalculating(false);
    }
  }, [canCalculate, yearcode, lumpNumber, postingDate, filter, search, page]);

  const changeFilter = (f: RowFilter) => { setFilter(f); setPage(0); calculate({ filter: f, page: 0 }); };
  const changeSearch = (v: string) => { setSearch(v); setPage(0); };
  const goPage = (p: number) => { setPage(p); calculate({ page: p }); };

  // search is applied on Enter / button so each keystroke does not run the whole calculation
  const applySearch = () => calculate({ search, page: 0 });

  const post = async (): Promise<{ ok: true; voucherNo: string; members: number; total: number } | { ok: false; error: string }> => {
    if (!canCalculate || yearcode == null) return { ok: false, error: 'Enter the lump sum first' };
    setPosting(true);
    try {
      const res = await apiService.postGroupInsurance({ yearcode, lumpSum: lumpNumber, postingDate: postingDate || undefined });
      if (!res.success) return { ok: false, error: (res as any).message || 'Posting failed' };
      const d = unwrap(res.data);
      await loadContext();
      setPreview(null);
      return { ok: true, voucherNo: d.voucherNo, members: d.membersCharged, total: d.totalCharged };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Posting failed' };
    } finally {
      setPosting(false);
    }
  };

  const loadRun = async (id: number, p = 0, q = ''): Promise<{ run: RunInfo; rows: ChargeRow[]; total: number } | null> => {
    try {
      const res = await apiService.getGroupInsuranceRun(id, { search: q.trim() || undefined, limit: PAGE_SIZE, offset: p * PAGE_SIZE });
      return res.success ? (unwrap(res.data) as any) : null;
    } catch { return null; }
  };

  return {
    years, runs, yearcode, setYearcode, lumpSum, setLumpSum, postingDate, setPostingDate,
    filter, changeFilter, search, changeSearch, applySearch, page, goPage,
    preview, calculating, posting, error, setError, loadingCtx, canCalculate, calculate, post, loadRun, reload: loadContext,
  };
};

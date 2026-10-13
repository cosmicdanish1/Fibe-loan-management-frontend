// hook/useMemberStatus.ts
// Data for the Member Status window (ES-100): which retired members can be marked inactive, which are
// still waiting for their RD to reach zero, who retires soon — plus the manual mark-inactive / re-activate actions.
import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../../../services/api';

export type StatusCategory = 'ready' | 'retired-rd' | 'upcoming';

export interface StatusRow {
  memberNo: string;
  name: string;
  officeName: string | null;
  retirementDate: string | null;
  rdBalance: number;
  loanBalance: number;
  expectedInactiveMonth: string | null;
  note: string;
}

export interface StatusSummary { ready: number; retiredWithRd: number; upcoming: number; upcomingMonths: number }

export interface MemberCheck {
  memberNo: string;
  name: string;
  active: boolean;
  retirementDate: string | null;
  retired: boolean;
  rdBalance: number;
  loanBalance: number;
  readyToInactivate: boolean;
  warnings: string[];
}

export interface HistoryRow {
  id: number;
  action: 'MARK_INACTIVE' | 'REACTIVATE';
  reason: string;
  retirement_date: string | null;
  rd_balance: number;
  loan_balance: number;
  forced: boolean;
  done_by: string;
  done_at: string;
}

// TransformInterceptor can wrap a controller's { success, data } once more
const unwrap = (d: any): any => (d && typeof d === 'object' && !Array.isArray(d) && 'success' in d && 'data' in d ? d.data : d);

export const PAGE_SIZE = 100;

export const useMemberStatus = () => {
  const [category, setCategory] = useState<StatusCategory>('ready');
  const [months, setMonths] = useState(12);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [summary, setSummary] = useState<StatusSummary | null>(null);
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reqId = useRef(0); // ignore out-of-order responses

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const [s, l] = await Promise.all([
        apiService.getMemberStatusSummary(months),
        apiService.getMemberStatusList({ category, months, search: search.trim(), limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
      ]);
      if (id !== reqId.current) return;
      if (!s.success || !l.success) throw new Error((l as any).message || (s as any).message || 'Could not load members');
      setSummary(unwrap(s.data) as StatusSummary);
      const list = unwrap(l.data) as { rows: StatusRow[]; total: number };
      setRows(list?.rows || []);
      setTotal(list?.total || 0);
    } catch (e: any) {
      if (id !== reqId.current) return;
      setRows([]); setTotal(0);
      setError(e?.message || 'Could not load members');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [category, months, search, page]);

  // Debounce the search box; category / month / page changes load straight away.
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const changeCategory = (c: StatusCategory) => { setCategory(c); setPage(0); };
  const changeSearch = (v: string) => { setSearch(v); setPage(0); };
  const changeMonths = (m: number) => { setMonths(m); setPage(0); };

  const check = async (memberNo: string): Promise<{ data?: MemberCheck; error?: string }> => {
    try {
      const res = await apiService.checkMemberStatus(memberNo.trim());
      if (!res.success) return { error: (res as any).message || 'Member not found' };
      return { data: unwrap(res.data) as MemberCheck };
    } catch (e: any) {
      return { error: e?.message || 'Member not found' };
    }
  };

  const history = async (memberNo: string): Promise<HistoryRow[]> => {
    try {
      const res = await apiService.getMemberStatusHistory(memberNo);
      const d = res.success ? unwrap(res.data) : [];
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  };

  const markInactive = async (memberNo: string, reason: string, force: boolean) => {
    try {
      const res = await apiService.markMemberInactive(memberNo, reason, force);
      if (res.success) { await load(); return { ok: true as const }; }
      return { ok: false as const, error: (res as any).message || 'Could not mark the member inactive' };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || 'Could not mark the member inactive' };
    }
  };

  const reactivate = async (memberNo: string, reason: string) => {
    try {
      const res = await apiService.reactivateMember(memberNo, reason);
      if (res.success) { await load(); return { ok: true as const }; }
      return { ok: false as const, error: (res as any).message || 'Could not re-activate the member' };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || 'Could not re-activate the member' };
    }
  };

  return {
    category, changeCategory, months, changeMonths, search, changeSearch, page, setPage,
    summary, rows, total, loading, error, reload: load,
    check, history, markInactive, reactivate,
  };
};

// hook/useNotificationCentre.ts
// Notification Centre (ES-101): every system notification in one list — members who can be marked inactive,
// members about to retire, group insurance, negative RD, failed / pending messages, day end. Read state is per user.
import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../../../services/api';

export type Severity = 'error' | 'warning' | 'info';
export type NotifStatus = 'open' | 'resolved';

export interface NotificationRow {
  id: number;
  kind: string;
  severity: Severity;
  title: string;
  body: string;
  memberNo: string | null;
  memberName: string | null;
  actionPath: string | null;
  actionLabel: string | null;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  read: boolean;
}

export interface Summary {
  open: number;
  unread: number;
  bySeverity: Record<Severity, number>;
  byKind: Record<string, { total: number; unread: number }>;
  lastSyncedAt: string | null;
}

export const KIND_LABEL: Record<string, string> = {
  MEMBER_READY_INACTIVE: 'Ready to mark inactive',
  MEMBER_RETIRING_SOON: 'Retiring soon',
  MEMBER_NO_RETIREMENT_DATE: 'No retirement date',
  INSURANCE_DUE: 'Group insurance',
  NEGATIVE_RD: 'Negative RD',
  MESSAGES_FAILED: 'Failed messages',
  MESSAGES_PENDING: 'Pending messages',
  DAYEND_PENDING: 'Day end',
};

export const KIND_GROUPS: { label: string; kinds: string[] }[] = [
  { label: 'Members', kinds: ['MEMBER_READY_INACTIVE', 'MEMBER_RETIRING_SOON', 'MEMBER_NO_RETIREMENT_DATE'] },
  { label: 'Money', kinds: ['INSURANCE_DUE', 'NEGATIVE_RD'] },
  { label: 'System', kinds: ['MESSAGES_FAILED', 'MESSAGES_PENDING', 'DAYEND_PENDING'] },
];

export const PAGE_SIZE = 50;
const REFRESH_MS = 2 * 60_000;

// TransformInterceptor can wrap a controller's { success, data } once more
const unwrap = (d: any): any => (d && typeof d === 'object' && !Array.isArray(d) && 'success' in d && 'data' in d ? d.data : d);

export const useNotificationCentre = () => {
  const [status, setStatus] = useState<NotifStatus>('open');
  const [kind, setKind] = useState<string>('');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const reqId = useRef(0);

  const fetchPage = useCallback(async (offset: number) => {
    const res = await apiService.getNotificationCentreList({
      status, kind: kind || undefined, severity: severity || undefined, unreadOnly, search: search.trim() || undefined,
      limit: PAGE_SIZE, offset,
    });
    if (!res.success) throw new Error((res as any).message || 'Could not load notifications');
    return unwrap(res.data) as { rows: NotificationRow[]; total: number };
  }, [status, kind, severity, unreadOnly, search]);

  const load = useCallback(async (silent = false) => {
    const id = ++reqId.current;
    if (!silent) setLoading(true);
    setError('');
    try {
      const [list, sum] = await Promise.all([fetchPage(0), apiService.getNotificationCentreSummary()]);
      if (id !== reqId.current) return;
      setRows(list.rows || []);
      setTotal(list.total || 0);
      if (sum.success) setSummary(unwrap(sum.data) as Summary);
    } catch (e: any) {
      if (id !== reqId.current) return;
      setError(e?.message || 'Could not load notifications');
      setRows([]); setTotal(0);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [fetchPage]);

  // search is debounced; every other filter loads straight away
  useEffect(() => {
    const t = setTimeout(() => load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  // keep the list fresh while the window stays open
  useEffect(() => {
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await fetchPage(rows.length);
      setRows(prev => {
        const seen = new Set(prev.map(r => r.id));
        return [...prev, ...(next.rows || []).filter(r => !seen.has(r.id))];
      });
      setTotal(next.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Could not load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshSummary = async () => {
    const sum = await apiService.getNotificationCentreSummary();
    if (sum.success) setSummary(unwrap(sum.data) as Summary);
  };

  // re-check the data now, then reload
  const syncNow = async () => {
    setSyncing(true); setError('');
    try {
      const res = await apiService.syncNotificationCentre();
      if (!res.success) throw new Error((res as any).message || 'Could not refresh');
      await load(true);
    } catch (e: any) {
      setError(e?.message || 'Could not refresh');
    } finally {
      setSyncing(false);
    }
  };

  const setRead = async (row: NotificationRow, read: boolean) => {
    if (row.read === read) return;
    setRows(prev => (unreadOnly && read ? prev.filter(r => r.id !== row.id) : prev.map(r => (r.id === row.id ? { ...r, read } : r))));
    if (unreadOnly && read) setTotal(t => Math.max(0, t - 1));
    try {
      const res = read ? await apiService.markNotificationRead(row.id) : await apiService.markNotificationUnread(row.id);
      if (!res.success) throw new Error('failed');
      await refreshSummary();
    } catch {
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, read: !read } : r)));
      setError('Could not update the notification');
    }
  };

  const markAllRead = async () => {
    try {
      const res = await apiService.markAllNotificationsRead(kind || undefined);
      if (!res.success) throw new Error('failed');
      await load(true);
    } catch {
      setError('Could not mark all as read');
    }
  };

  return {
    status, setStatus, kind, setKind, severity, setSeverity, unreadOnly, setUnreadOnly, search, setSearch,
    rows, total, summary, loading, loadingMore, syncing, error,
    reload: () => load(), loadMore, syncNow, setRead, markAllRead,
  };
};

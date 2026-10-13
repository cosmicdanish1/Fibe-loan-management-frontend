import { useCallback, useEffect, useState } from 'react';
import apiService from '../../../../services/api';

export interface HeadOrderRow {
  code: string;
  headName: string;
  headType: string;
  position: number;
}

// TransformInterceptor can wrap a controller's { success, data } once more
const unwrap = (d: any): any[] => {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
};

export const useReportHeadOrder = () => {
  const [rows, setRows] = useState<HeadOrderRow[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getReportHeadOrder();
      const data = res.success ? (unwrap(res.data) as HeadOrderRow[]) : [];
      setRows(data);
      setSaved(data.map(r => r.code));
    } catch {
      setRows([]);
      setSaved([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (): Promise<boolean> => {
    try {
      const res = await apiService.saveReportHeadOrder(rows.map(r => r.code));
      if (res.success) setSaved(rows.map(r => r.code));
      return !!res.success;
    } catch {
      return false;
    }
  };

  const reset = async (): Promise<boolean> => {
    try {
      const res = await apiService.resetReportHeadOrder();
      if (res.success) await load();
      return !!res.success;
    } catch {
      return false;
    }
  };

  const dirty = rows.length > 0 && rows.some((r, i) => r.code !== saved[i]);

  return { rows, setRows, loading, dirty, save, reset, refresh: load };
};

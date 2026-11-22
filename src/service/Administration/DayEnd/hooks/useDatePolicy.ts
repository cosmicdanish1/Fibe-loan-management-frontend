// Day End > Date settings: per window, the Day-End working date (default) or the real date of the day.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../../../../services/api';

export type DateMode = 'WORKING' | 'SYSTEM';

export interface DatePolicyRow {
  key: string;
  label: string;
  area: string;
  kind: 'posts' | 'stores';
  wired: boolean;
  mode: DateMode;
  changedBy: string | null;
  changedAt: string | null;
}

export interface ImportPreview {
  file: unknown;
  willChange: Array<{ windowKey: string; label: string; from: DateMode; to: DateMode }>;
  unchanged: number;
}

const unwrap = (res: any) => (res?.data && typeof res.data === 'object' && 'windows' in res.data ? res.data : res?.data?.data ?? res?.data);

export const useDatePolicy = () => {
  const [rows, setRows] = useState<DatePolicyRow[]>([]);
  const [draft, setDraft] = useState<Record<string, DateMode>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Array<{ windowKey: string; from: string; to: string; changedBy: string; changedAt: string; source: string }>>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res: any = await apiService.getDatePolicy();
      const body = unwrap(res);
      if (!res?.success || !Array.isArray(body?.windows)) throw new Error(res?.message || 'The date settings could not be loaded.');
      setRows(body.windows as DatePolicyRow[]);
      setDraft({});
    } catch (e: any) {
      setError(e?.message || 'The date settings could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const modeOf = useCallback((row: DatePolicyRow): DateMode => draft[row.key] ?? row.mode, [draft]);

  /** Choose a mode for a window. Choosing what is already saved drops it from the unsaved changes. */
  const setMode = useCallback((key: string, mode: DateMode) => {
    setDraft((prev) => {
      const saved = rows.find((r) => r.key === key)?.mode;
      const next = { ...prev };
      if (saved === mode) delete next[key]; else next[key] = mode;
      return next;
    });
  }, [rows]);

  const dirtyKeys = useMemo(() => Object.keys(draft), [draft]);
  const discard = useCallback(() => setDraft({}), []);

  const save = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (dirtyKeys.length === 0) return { ok: true, message: 'Nothing to save.' };
    setIsSaving(true);
    try {
      const res: any = await apiService.saveDatePolicy(dirtyKeys.map((k) => ({ windowKey: k, mode: draft[k] as DateMode })));
      if (!res?.success) return { ok: false, message: res?.message || 'The date settings could not be saved.' };
      await load();
      return { ok: true, message: `${dirtyKeys.length} window(s) saved.` };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'The date settings could not be saved.' };
    } finally {
      setIsSaving(false);
    }
  }, [dirtyKeys, draft, load]);

  /** The settings as the text of a file to download. */
  const exportText = useCallback(async (): Promise<string | null> => {
    const res: any = await apiService.exportDatePolicy();
    const body = res?.data?.data ?? res?.data;
    if (!res?.success || !body) return null;
    return JSON.stringify(body, null, 2);
  }, []);

  /** Reads a file's text and asks the server what it would change. Writes nothing. */
  const previewImport = useCallback(async (text: string): Promise<{ ok: true; preview: ImportPreview } | { ok: false; message: string }> => {
    let file: unknown;
    try { file = JSON.parse(text); } catch { return { ok: false, message: 'This is not a valid JSON file.' }; }
    try {
      const res: any = await apiService.previewDatePolicyImport(file);
      const body = res?.data?.data ?? res?.data;
      if (!res?.success || !body) return { ok: false, message: res?.message || 'The file was not accepted.' };
      return { ok: true, preview: { file, willChange: body.willChange ?? [], unchanged: body.unchanged ?? 0 } };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'The file was not accepted.' };
    }
  }, []);

  const applyImport = useCallback(async (file: unknown): Promise<{ ok: boolean; message: string }> => {
    setIsSaving(true);
    try {
      const res: any = await apiService.importDatePolicy(file);
      if (!res?.success) return { ok: false, message: res?.message || 'The file could not be applied.' };
      await load();
      return { ok: true, message: 'The file was applied.' };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'The file could not be applied.' };
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const loadHistory = useCallback(async () => {
    try {
      const res: any = await apiService.getDatePolicyHistory();
      const body = res?.data?.data ?? res?.data;
      setHistory(Array.isArray(body?.history) ? body.history : []);
    } catch { setHistory([]); }
  }, []);

  return { rows, modeOf, setMode, dirtyKeys, discard, save, isLoading, isSaving, error, reload: load, exportText, previewImport, applyImport, history, loadHistory };
};

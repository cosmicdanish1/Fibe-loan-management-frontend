import { useEffect, useRef, useState } from 'react';
import { apiService } from '../../../../services/api';

export interface CalcState<T> {
  data: T | null;
  error: string | null;
  fieldErrors: Array<{ field?: string | undefined; message: string }>;
  loading: boolean;
}

/**
 * Runs one read-only calculation on the server whenever `body` changes (debounced). `body` is null while the form is not
 * ready (empty or half-typed numbers): then nothing is sent and the last good result stays on screen.
 * A slow older answer can never overwrite a newer one.
 */
export function useServerCalc<T>(kind: string, body: Record<string, unknown> | null, delayMs = 350): CalcState<T> {
  const [state, setState] = useState<CalcState<T>>({ data: null, error: null, fieldErrors: [], loading: false });
  const seq = useRef(0);
  const key = body ? JSON.stringify(body) : null;

  useEffect(() => {
    if (key === null) { setState((s) => ({ ...s, loading: false })); return undefined; }
    const mine = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(async () => {
      const res: any = await apiService.societyCalculate(kind, JSON.parse(key));
      if (mine !== seq.current) return; // a newer request has been sent since
      if (res?.success) {
        setState({ data: res.data as T, error: null, fieldErrors: [], loading: false });
      } else {
        const errors = Array.isArray(res?.errors) ? res.errors : [];
        setState((s) => ({
          data: s.data,
          error: res?.error || res?.message || 'The calculation failed.',
          fieldErrors: errors.map((e: any) => ({ field: e.field, message: e.message })),
          loading: false,
        }));
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [kind, key, delayMs]);

  return state;
}

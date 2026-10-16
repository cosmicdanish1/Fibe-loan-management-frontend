import React, { useEffect, useRef, useState } from 'react';
import ReportViewSwitcher from './ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from './GenericPro';
import type { ReportViewId } from './reportViews';
import './proViews.css';

/**
 * Pro views inside a window that has not moved to the app kit yet. The window keeps its own
 * layout, Legacy body and print; this adds only the Legacy / Pro switch and the Pro body,
 * drawn as a small kit island (`.app-window.aw-embed`).
 */
export const ProBar: React.FC<{
  enabled: ReportViewId[];
  view: ReportViewId;
  setView: (v: ReportViewId) => void;
  /** Windows that print with window.print() get a button that returns to Legacy first. */
  printLegacy?: boolean;
  className?: string;
}> = ({ enabled, view, setView, printLegacy, className = '' }) => {
  if (enabled.length < 2) return null;
  return (
    <div className={`app-window aw-embed ${className}`.trim()} data-noprint="true">
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
        {printLegacy && view !== 'legacy' && (
          <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => { setView('legacy'); setTimeout(() => window.print(), 250); }}>Print (legacy layout)</button>
        )}
        <ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />
      </div>
    </div>
  );
};

export function ProBody<T>({ view, spec, title, subtitle, height = 'calc(100vh - 220px)' }: {
  view: ReportViewId;
  spec: ProSpec<T>;
  title: string;
  subtitle: string;
  height?: string;
}) {
  if (view === 'legacy') return null;
  return (
    <div className="app-window aw-embed">
      {view === 'bento' && <GenericBento spec={spec} />}
      {view === 'terminal' && <div style={{ height, minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {view === 'editorial' && <GenericEditorial spec={spec} title={title} subtitle={subtitle} />}
    </div>
  );
}

/**
 * Loads every row for a Pro view when a window pages its Legacy list. The fetch runs only while a
 * Pro view is on screen and again when  (the filters + total) changes.
 */
export function useProRows<T>(active: boolean, key: string, fetcher: () => Promise<T[] | null>) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const last = useRef('');
  useEffect(() => {
    if (!active) return;
    if (last.current === key && rows) return;
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then(r => { if (!cancelled && r) { setRows(r); last.current = key; } })
      .catch(() => { /* the Legacy view still works */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);
  return { rows: rows ?? [], loading, ready: !!rows && !loading };
}

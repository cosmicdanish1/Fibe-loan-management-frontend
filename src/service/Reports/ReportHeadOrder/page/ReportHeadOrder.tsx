// page/ReportHeadOrder.tsx
// One global head order for every report that groups rows by account head
// (Member Detail Ledger, Cash Book, Consolidation, ...). ES-57.
//
// Drag-and-drop is pointer-based, not HTML5 DnD, and runs entirely outside React: the grabbed row
// follows the cursor and the rows it passes slide aside through transforms written straight to the
// DOM. React renders exactly once, when the row is dropped and the new order is committed.

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  X, Save, RefreshCw, RotateCcw, Search, GripVertical, ChevronUp, ChevronDown,
  ChevronsUp, ListOrdered, AlertCircle, Info,
} from 'lucide-react';
import { useReportHeadOrder, type HeadOrderRow } from '../hook/useReportHeadOrder';

const ROW_H = 44;
const SLIDE = 'transform 170ms cubic-bezier(.2,.8,.2,1)';
const COLS = '36px 84px 104px minmax(0,1fr) 72px 104px';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, msg: string, detail = '') => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${title}] ${msg}${detail ? '\n\n' + detail : ''}`);
  }
};

const confirmDialog = async (title: string, msg: string, detail: string, okLabel: string): Promise<boolean> => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    const res = await api.showMessageBox({
      type: 'warning', title, message: msg, detail,
      buttons: ['Cancel', okLabel], defaultId: 0, cancelId: 0,
    });
    return res.response === 1;
  }
  return window.confirm(`${msg}\n\n${detail}`);
};

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Move the item at `from` so it ends up at index `to` (both 0-based). */
const moveItem = (list: HeadOrderRow[], from: number, to: number): HeadOrderRow[] => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
};

// ── one row ─────────────────────────────────────────────────────────────────
interface RowProps {
  row: HeadOrderRow;
  index: number;
  last: boolean;
  canDrag: boolean;
  onGrab: (e: React.PointerEvent<HTMLElement>, index: number) => void;
  onMove: (from: number, to: number) => void;
}

const Row = memo(function Row({ row, index, last, canDrag, onGrab, onMove }: RowProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const n = parseInt(draft ?? '', 10);
    setDraft(null);
    if (Number.isFinite(n)) onMove(index, n - 1);
  };

  return (
    <div className="rho-row" data-row>
      <span
        className="rho-grip"
        onPointerDown={canDrag ? e => onGrab(e, index) : undefined}
        style={{ cursor: canDrag ? 'grab' : 'default', opacity: canDrag ? 1 : 0.25 }}
        aria-hidden="true"
      >
        <GripVertical size={15} />
      </span>
      <span>
        <input
          className="aw-input is-right"
          aria-label={`Position of ${row.code}`}
          inputMode="numeric"
          value={draft ?? String(index + 1)}
          onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
          onFocus={e => e.target.select()}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setDraft(null); }}
          onBlur={() => { if (draft !== null) commit(); }}
        />
      </span>
      <span className="rho-code">{row.code}</span>
      <span className="rho-name" title={row.headName}>{row.headName}</span>
      <span><span className="aw-pill tone-muted">{row.headType || '—'}</span></span>
      <span style={{ display: 'inline-flex', gap: 2 }}>
        <button type="button" className="aw-icon-btn is-sm" aria-label={`Move ${row.code} to top`} disabled={index === 0} onClick={() => onMove(index, 0)}>
          <ChevronsUp size={14} />
        </button>
        <button type="button" className="aw-icon-btn is-sm" aria-label={`Move ${row.code} up`} disabled={index === 0} onClick={() => onMove(index, index - 1)}>
          <ChevronUp size={14} />
        </button>
        <button type="button" className="aw-icon-btn is-sm" aria-label={`Move ${row.code} down`} disabled={last} onClick={() => onMove(index, index + 1)}>
          <ChevronDown size={14} />
        </button>
      </span>
    </div>
  );
});

// ── page ────────────────────────────────────────────────────────────────────
interface DragRef {
  from: number; over: number; n: number;
  startY: number; startScroll: number; pointerY: number;
  top: number; bottom: number;           // list's viewport edges, read once at drag start
  els: HTMLElement[]; el: HTMLElement; raf: number; settling: boolean;
}

const ReportHeadOrder: React.FC = () => {
  const { rows, setRows, loading, dirty, save, reset, refresh } = useReportHeadOrder();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragRef | null>(null);

  const searching = search.trim().length > 0;
  const term = search.trim().toLowerCase();
  const visible = rows
    .map((r, index) => ({ r, index }))
    .filter(({ r }) => !searching || r.code.toLowerCase().includes(term) || r.headName.toLowerCase().includes(term));

  const move = useCallback((from: number, to: number) => {
    setRows(prev => moveItem(prev, from, clamp(to, 0, prev.length - 1)));
  }, [setRows]);

  // Rows between the old and new slot slide one row-height out of the way. Written straight to the DOM.
  const applyShifts = (d: DragRef, over: number) => {
    const lo = Math.min(d.from, d.over, over), hi = Math.max(d.from, d.over, over);
    for (let i = lo; i <= hi; i++) {
      if (i === d.from) continue;
      let shift = 0;
      if (d.from < over && i > d.from && i <= over) shift = -ROW_H;
      else if (d.from > over && i >= over && i < d.from) shift = ROW_H;
      const el = d.els[i]!;
      el.style.transition = SLIDE;
      el.style.transform = shift ? `translate3d(0,${shift}px,0)` : '';
    }
  };

  // per-frame: follow the pointer, auto-scroll near the edges, work out the drop slot (no layout reads)
  const frame = useCallback(() => {
    const d = dragRef.current;
    const list = listRef.current;
    if (!d || !list || d.settling) return;
    const EDGE = 56;
    let v = 0;
    if (d.pointerY < d.top + EDGE) v = -Math.ceil((d.top + EDGE - d.pointerY) / 3);
    else if (d.pointerY > d.bottom - EDGE) v = Math.ceil((d.pointerY - (d.bottom - EDGE)) / 3);
    if (v) list.scrollTop += clamp(v, -22, 22);

    const dy = clamp(d.pointerY - d.startY + (list.scrollTop - d.startScroll), -d.from * ROW_H, (d.n - 1 - d.from) * ROW_H);
    d.el.style.transform = `translate3d(0,${dy}px,0)`;
    const over = clamp(Math.round(d.from + dy / ROW_H), 0, d.n - 1);
    if (over !== d.over) { applyShifts(d, over); d.over = over; }
    d.raf = requestAnimationFrame(frame);
  }, []);

  const onGrab = useCallback((e: React.PointerEvent<HTMLElement>, index: number) => {
    if (e.button !== 0 || dragRef.current) return;
    const el = (e.currentTarget as HTMLElement).closest('[data-row]') as HTMLElement | null;
    const list = listRef.current;
    if (!el || !list) return;
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const els = Array.from(list.querySelectorAll<HTMLElement>('[data-row]'));
    const box = list.getBoundingClientRect();
    const d: DragRef = {
      from: index, over: index, n: els.length,
      startY: e.clientY, startScroll: list.scrollTop, pointerY: e.clientY,
      top: box.top, bottom: box.bottom, els, el, raf: 0, settling: false,
    };
    dragRef.current = d;
    el.classList.add('is-grabbed');
    el.style.willChange = 'transform';      // only the grabbed row gets its own layer
    list.classList.add('is-dragging');
    d.raf = requestAnimationFrame(frame);

    const onMovePtr = (ev: PointerEvent) => { d.pointerY = ev.clientY; };
    const finish = () => {
      handle.removeEventListener('pointermove', onMovePtr);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      cancelAnimationFrame(d.raf);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      d.settling = true;
      // glide the grabbed row into its slot, then commit the new order
      d.el.style.transition = SLIDE;
      d.el.style.transform = `translate3d(0,${(d.over - d.from) * ROW_H}px,0)`;
      window.setTimeout(() => {
        // Commit the new order and clear every inline transform in the same task, so no frame
        // is ever painted with the old order and the shifts removed.
        flushSync(() => move(d.from, d.over));
        for (const x of d.els) { x.style.transition = ''; x.style.transform = ''; x.style.willChange = ''; }
        d.el.classList.remove('is-grabbed');
        list.classList.remove('is-dragging');
        dragRef.current = null;
      }, 180);
    };
    handle.addEventListener('pointermove', onMovePtr);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }, [frame, move]);

  useEffect(() => () => {
    if (dragRef.current) cancelAnimationFrame(dragRef.current.raf);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const ok = await save();
    setSaving(false);
    if (!ok) await showDialog('error', 'Save Failed', 'Could not save the report head order.', 'Check the server connection and that you are signed in as an administrator, then retry.');
  };

  const handleReset = async () => {
    const ok = await confirmDialog(
      'Reset Head Order',
      'Reset to head-code order?',
      'Your custom order will be replaced by plain head-code order (A1000, A1001, ...). This takes effect on every report immediately.',
      'Reset',
    );
    if (!ok) return;
    setSaving(true);
    const done = await reset();
    setSaving(false);
    if (!done) await showDialog('error', 'Reset Failed', 'Could not reset the report head order.', 'Check the server connection and retry.');
  };

  const handleRefresh = async () => {
    if (dirty) {
      const ok = await confirmDialog('Discard Changes', 'Discard unsaved changes?', 'Reloading will drop your unsaved reordering.', 'Discard');
      if (!ok) return;
    }
    refresh();
  };

  const handleClose = async () => {
    if (dirty) {
      const ok = await confirmDialog('Unsaved Changes', 'Close without saving?', 'Your reordering has not been saved.', 'Close');
      if (!ok) return;
    }
    closeWindow();
  };

  return (
    <div className="app-window">
      <style>{`
        .rho-head, .rho-row { display: grid; grid-template-columns: ${COLS}; align-items: center; column-gap: 8px; padding: 0 12px; box-sizing: border-box; }
        .rho-head { height: 36px; position: sticky; top: 0; z-index: 3; background: var(--aw-surface-muted); border-bottom: 1px solid var(--aw-border-strong);
          font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--aw-muted); }
        .rho-row { height: ${ROW_H}px; position: relative; background: var(--aw-surface); border-bottom: 1px solid var(--aw-border); contain: layout style; }
        .rho-row:hover { background: var(--aw-surface-muted); }
        .rho-row.is-grabbed { z-index: 4; background: var(--aw-accent-soft); box-shadow: var(--aw-shadow-pop); border-radius: 8px; border-bottom-color: transparent; }
        .rho-row.is-grabbed .rho-grip { cursor: grabbing !important; }
        .rho-grip { display: inline-flex; align-items: center; justify-content: center; height: 100%; color: var(--aw-muted); touch-action: none; user-select: none; }
        .rho-list.is-dragging .rho-row:not(.is-grabbed):hover { background: var(--aw-surface); }
        .rho-code { color: var(--aw-accent); font-weight: 700; }
        .rho-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
        .rho-list { position: relative; overflow-y: auto; overflow-x: hidden; max-height: 64vh; border: 1px solid var(--aw-border); border-radius: var(--aw-radius); overscroll-behavior: contain; }
        .rho-center { text-align: center; }
      `}</style>

      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Report Head Order</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ListOrdered size={12} /> Order in which account heads print on reports
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleRefresh} disabled={loading || saving} className="aw-icon-btn" aria-label="Reload" data-tip="Reload" data-tip-pos="bottom-end">
            <RefreshCw size={14} className={loading ? 'aw-spin' : ''} />
          </button>
          <button type="button" onClick={handleReset} disabled={loading || saving} className="aw-btn aw-btn-ghost">
            <RotateCcw size={13} /> Reset to code order
          </button>
          <button type="button" onClick={handleSave} disabled={!dirty || saving} className="aw-btn aw-btn-primary">
            {saving ? <RefreshCw size={13} className="aw-spin" /> : <Save size={13} />} Save
          </button>
          <button type="button" onClick={handleClose} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <section className="aw-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="aw-input-wrap has-icon" style={{ maxWidth: 320, flex: '1 1 220px' }}>
              <Search size={13} />
              <input
                type="text"
                placeholder="Search head code or name..."
                aria-label="Search heads"
                className="aw-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <span className="is-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Info size={12} />
              {searching
                ? 'Clear the search to drag. You can still type a position number or use the arrows.'
                : 'Drag the grip, use the arrows, or type a position number. Top of the list prints first.'}
            </span>
          </div>

          <div className="rho-list" ref={listRef}>
            <div className="rho-head" role="row">
              <span aria-hidden="true" />
              <span className="rho-center">Position</span>
              <span>Head Code</span>
              <span>Head Name</span>
              <span>Type</span>
              <span>Move</span>
            </div>

            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-${i}`} className="rho-row">
                {Array.from({ length: 6 }).map((_, j) => (
                  <span key={j} className="aw-skeleton" style={{ display: 'block', height: 14, width: `${50 + (j * 17) % 45}%` }} />
                ))}
              </div>
            ))}

            {!loading && visible.length === 0 && (
              <div className="aw-empty" style={{ padding: 32 }}>
                <AlertCircle size={26} />
                <strong className="aw-strong">{searching ? 'No matching heads' : 'No heads found'}</strong>
              </div>
            )}

            {!loading && visible.map(({ r, index }) => (
              <Row
                key={r.code}
                row={r}
                index={index}
                last={index === rows.length - 1}
                canDrag={!searching}
                onGrab={onGrab}
                onMove={move}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ListOrdered size={12} /> {rows.length} head{rows.length !== 1 ? 's' : ''}
          {searching ? ` · ${visible.length} shown` : ''}
        </span>
        <span style={{ color: dirty ? 'var(--aw-warning)' : undefined }}>
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
      </div>
    </div>
  );
};

export default ReportHeadOrder;

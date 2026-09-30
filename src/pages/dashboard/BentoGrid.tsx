import React, { useLayoutEffect, useRef, useState } from 'react';
import { GripHorizontal } from 'lucide-react';
import type { RowLayout, CardLayout } from './dashboardLayout';

const MIN_WEIGHT = 0.35;
const MIN_ROW_HEIGHT = 110;

// Where a dragged card goes: next to a card in its row, or in a new row above / below it.
type Dest =
  | { targetId: string; side: 'before' | 'after' }
  | { targetId: string; row: 'above' | 'below' };

interface BentoGridProps {
  rows: RowLayout[];
  /** Cards that are switched off in Settings: not drawn, but they keep their place in the layout. */
  hidden: Set<string>;
  /** `commit` is false while a drag is in progress and true when it ends (time to save). */
  onChange: (rows: RowLayout[], commit: boolean) => void;
  renderCard: (id: string) => React.ReactNode;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Pure: the layout after moving card `id` to `dest`.
const applyMove = (rows: RowLayout[], id: string, dest: Dest): RowLayout[] => {
  let moved: CardLayout | undefined;
  const base = rows.map(r => ({
    ...r,
    cards: r.cards.filter(c => {
      if (c.id === id) { moved = c; return false; }
      return true;
    }),
  }));
  if (!moved) return rows;
  const ri = base.findIndex(r => r.cards.some(c => c.id === dest.targetId));
  if (ri < 0) return rows;
  if ('side' in dest) {
    const row = base[ri]!;
    const ci = row.cards.findIndex(c => c.id === dest.targetId);
    row.cards.splice(ci + (dest.side === 'after' ? 1 : 0), 0, moved);
  } else {
    let rid = `row-mv-${id}`;
    while (base.some(r => r.id === rid)) rid += 'x';
    base.splice(ri + (dest.row === 'below' ? 1 : 0), 0, { id: rid, cards: [moved] });
  }
  return base.filter(r => r.cards.length > 0);
};

const sameDest = (a: Dest | null, b: Dest | null) => JSON.stringify(a) === JSON.stringify(b);

const BentoGrid: React.FC<BentoGridProps> = ({ rows, hidden, onChange, renderCard }) => {
  const gridEl = useRef<HTMLDivElement | null>(null);
  const rowEls = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [preview, setPreview] = useState<RowLayout[] | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; label: string } | null>(null);

  // While a card is being dragged the grid shows the layout it would have if dropped now.
  const shown = preview ?? rows;
  const visibleRows = shown
    .map(row => ({ row, cards: row.cards.filter(c => !hidden.has(c.id)) }))
    .filter(x => x.cards.length > 0);

  // ── Slide animation: when cards change place, each glides from where it was ──
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const animateNext = useRef(false);
  useLayoutEffect(() => {
    const next = new Map<string, DOMRect>();
    gridEl.current?.querySelectorAll<HTMLElement>('[data-bento-cell]').forEach(el => {
      const id = el.dataset.bentoCell!;
      const r = el.getBoundingClientRect();
      next.set(id, r);
      const p = prevRects.current.get(id);
      if (animateNext.current && p) {
        const dx = p.left - r.left;
        const dy = p.top - r.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
            { duration: 260, easing: 'cubic-bezier(.32,.72,0,1)' },
          );
        }
      }
    });
    prevRects.current = next;
    animateNext.current = false;
  });

  // ── Resize: the edge between two neighbouring cards ───────────────────────
  const startSplit = (e: React.PointerEvent, rowId: string, aId: string, bId: string) => {
    e.preventDefault();
    const rowEl = rowEls.current[rowId];
    const snapshot = rows;
    const row = snapshot.find(r => r.id === rowId);
    if (!rowEl || !row) return;
    const visible = row.cards.filter(c => !hidden.has(c.id));
    const total = visible.reduce((s, c) => s + c.w, 0);
    const a = row.cards.find(c => c.id === aId);
    const b = row.cards.find(c => c.id === bId);
    if (!a || !b) return;
    const x0 = e.clientX;
    const width = rowEl.getBoundingClientRect().width || 1;
    let latest = snapshot;
    const apply = (dx: number) => {
      const na = clamp(a.w + (dx / width) * total, MIN_WEIGHT, a.w + b.w - MIN_WEIGHT);
      const nb = a.w + b.w - na;
      latest = snapshot.map(r => r.id !== rowId ? r : {
        ...r, cards: r.cards.map(c => c.id === aId ? { ...c, w: na } : c.id === bId ? { ...c, w: nb } : c),
      });
      onChange(latest, false);
    };
    const move = (ev: PointerEvent) => apply(ev.clientX - x0);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      onChange(latest, true);
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const equalise = (rowId: string) => {
    onChange(rows.map(r => r.id !== rowId ? r : { ...r, cards: r.cards.map(c => ({ ...c, w: 1 })) }), true);
  };

  // ── Resize: the bottom edge of a row ──────────────────────────────────────
  const startRowResize = (e: React.PointerEvent, rowId: string) => {
    e.preventDefault();
    const rowEl = rowEls.current[rowId];
    if (!rowEl) return;
    const snapshot = rows;
    const y0 = e.clientY;
    const h0 = rowEl.getBoundingClientRect().height;
    let latest = snapshot;
    const move = (ev: PointerEvent) => {
      const h = Math.max(MIN_ROW_HEIGHT, Math.round(h0 + (ev.clientY - y0)));
      latest = snapshot.map(r => r.id === rowId ? { ...r, h } : r);
      onChange(latest, false);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      onChange(latest, true);
    };
    document.body.style.cursor = 'row-resize';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const autoHeight = (rowId: string) => {
    onChange(rows.map(r => {
      if (r.id !== rowId) return r;
      const { h: _h, ...rest } = r;
      return rest;
    }), true);
  };

  // ── Move: press the grip, drag; the other cards slide aside to show where it lands ──
  // Pointer-based (the browser's native drag-and-drop is unreliable inside Electron).
  const startMove = (e: React.PointerEvent, cardId: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const cell = (e.currentTarget as HTMLElement).closest('.bento-cell');
    const label = cell?.querySelector('.aw-card-title')?.textContent || 'Card';
    const state: { active: boolean; dest: Dest | null } = { active: false, dest: null };

    // The card under the pointer (or the nearest one when the pointer is in a gap) decides the drop:
    // top / bottom edge = a new row above / below it; left / right half = beside it.
    const locate = (x: number, y: number): Dest | null => {
      const cells = Array.from(document.querySelectorAll<HTMLElement>('[data-bento-cell]'));
      let best: { el: HTMLElement; d: number } | null = null;
      for (const el of cells) {
        const r = el.getBoundingClientRect();
        const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
        const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
        const d = Math.hypot(dx, dy);
        if (!best || d < best.d) best = { el, d };
      }
      if (!best || best.d > 48) return state.dest;
      const id = best.el.dataset.bentoCell!;
      if (id === cardId) return state.dest; // over its own slot: keep the current spot
      const r = best.el.getBoundingClientRect();
      const ry = (y - r.top) / r.height;
      const rx = (x - r.left) / r.width;
      if (ry < 0.22) return { targetId: id, row: 'above' };
      if (ry > 0.78) return { targetId: id, row: 'below' };
      return { targetId: id, side: rx < 0.5 ? 'before' : 'after' };
    };

    const move = (ev: PointerEvent) => {
      if (!state.active) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
        state.active = true;
        setDragId(cardId);
        document.body.style.cursor = 'grabbing';
      }
      setGhost({ x: ev.clientX, y: ev.clientY, label });
      const dest = locate(ev.clientX, ev.clientY);
      if (dest && !sameDest(dest, state.dest)) {
        state.dest = dest;
        animateNext.current = true;
        setPreview(applyMove(rows, cardId, dest));
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      const { active, dest } = state;
      setGhost(null);
      setDragId(null);
      setPreview(null);
      if (active && dest) {
        animateNext.current = false; // the preview already showed the result
        onChange(applyMove(rows, cardId, dest), true);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div ref={gridEl} className="bento-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aw-gap)' }}>
      <style>{`
        .bento-cell .bento-grip { opacity: 0; }
        .bento-cell:hover .bento-grip, .bento-cell:focus-within .bento-grip { opacity: 1; }
        .bento-cell .bento-split::after { content: ''; position: absolute; top: 12%; bottom: 12%; left: 50%; width: 3px; margin-left: -1.5px; border-radius: 3px; background: var(--aw-accent); opacity: 0; }
        .bento-cell .bento-split:hover::after { opacity: .55; }
        .bento-row .bento-hgrip::after { content: ''; position: absolute; left: 30%; right: 30%; top: 50%; height: 3px; margin-top: -1.5px; border-radius: 3px; background: var(--aw-accent); opacity: 0; }
        .bento-row:hover .bento-hgrip::after { opacity: .3; }
        .bento-row .bento-hgrip:hover::after { opacity: .7; }
        .bento-inner > .aw-card { flex: 1 1 auto; min-width: 0; }
      `}</style>

      {visibleRows.map(({ row, cards }) => (
        <div
          key={row.id}
          ref={el => { rowEls.current[row.id] = el; }}
          className="bento-row"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--aw-gap)', position: 'relative', ...(row.h ? { height: row.h } : {}) }}
        >
          {cards.map((card, ci) => {
            const next = cards[ci + 1];
            const dragging = dragId === card.id;
            return (
              <div
                key={card.id}
                className="bento-cell"
                data-bento-cell={card.id}
                style={{
                  flex: `${card.w} 1 0`, minWidth: 200, position: 'relative', display: 'flex', minHeight: 0,
                  opacity: dragging ? 0.4 : 1,
                  outline: dragging ? '2px dashed var(--aw-accent)' : undefined,
                  outlineOffset: dragging ? 2 : undefined,
                  borderRadius: 'calc(var(--aw-radius) * 1.8)',
                }}
              >
                <div className="bento-inner" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: row.h ? 'auto' : 'visible' }}>
                  {renderCard(card.id)}
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  className="bento-grip"
                  onPointerDown={e => startMove(e, card.id)}
                  aria-label="Drag to move this card"
                  data-tip="Drag to move" data-tip-pos="bottom"
                  style={{
                    position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
                    width: 34, height: 14, padding: 0, border: '1px solid var(--aw-border-strong)', borderRadius: 7,
                    background: 'var(--aw-surface)', color: 'var(--aw-muted)', cursor: 'grab', touchAction: 'none',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <GripHorizontal size={12} />
                </div>

                {next && !dragId && (
                  <div
                    className="bento-split"
                    role="separator" aria-orientation="vertical" aria-label="Drag to resize"
                    onPointerDown={e => startSplit(e, row.id, card.id, next.id)}
                    onDoubleClick={() => equalise(row.id)}
                    style={{ position: 'absolute', top: 0, bottom: 0, right: 'calc(var(--aw-gap) / -2 - 6px)', width: 12, zIndex: 4, cursor: 'col-resize', touchAction: 'none' }}
                  />
                )}
              </div>
            );
          })}

          {!dragId && (
            <div
              className="bento-hgrip"
              role="separator" aria-orientation="horizontal" aria-label="Drag to change the row height"
              onPointerDown={e => startRowResize(e, row.id)}
              onDoubleClick={() => autoHeight(row.id)}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--aw-gap) / -2 - 6px)', height: 12, zIndex: 4, cursor: 'row-resize', touchAction: 'none' }}
            />
          )}
        </div>
      ))}

      {ghost && (
        <div
          style={{
            position: 'fixed', left: ghost.x + 14, top: ghost.y + 14, zIndex: 9999, pointerEvents: 'none',
            padding: '8px 14px', borderRadius: 10, border: '1px solid var(--aw-accent)', background: 'var(--aw-surface)',
            color: 'var(--aw-text)', fontWeight: 700, boxShadow: '0 14px 30px rgba(0,0,0,.28)', maxWidth: 260,
          }}
        >
          {ghost.label}
        </div>
      )}
    </div>
  );
};

export default BentoGrid;

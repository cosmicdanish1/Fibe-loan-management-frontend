import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GripHorizontal, X, Image as ImageIcon } from 'lucide-react';
import type { RowLayout, CardLayout } from './dashboardLayout';
import { useTranslation } from 'react-i18next';

const MIN_WEIGHT = 0.35;
/** A card is never resized narrower than this, so its content always fits. */
const MIN_CARD_PX = 220;
/** More than this many cards side by side would be too cramped to read. */
const MAX_PER_ROW = 4;

// Where a dragged card goes: next to a card in its row, or in a new row above / below it.
type Dest =
  | { targetId: string; side: 'before' | 'after' }
  | { targetId: string; row: 'above' | 'below' };

interface BentoGridProps {
  rows: RowLayout[];
  /** Cards that are switched off in Settings: not drawn, but they keep their place in the layout. */
  hidden: Set<string>;
  /** Customize mode. Cards can be moved and resized only while it is on; otherwise no handles exist at all. */
  editing: boolean;
  /** Customize mode: the × on a card. The card is switched off, not deleted; it can be added back. */
  onHide: (id: string) => void;
  /** The chosen dashboard picture (null when there is none), the cards that show it inside, and the Customize-mode switch for one card. */
  artUrl: string | null;
  artCards: Set<string>;
  onToggleArt: (id: string) => void;
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

// Layout rules: every row is a CSS grid whose columns follow the card weights, and its height always
// comes from the content. Nothing has a fixed pixel height, so one row can never run into the next.
// The styles (and the narrow-window reflow) live in dashboard.css.
const BentoGrid: React.FC<BentoGridProps> = ({ rows, hidden, editing, onHide, artUrl, artCards, onToggleArt, onChange, renderCard }) => {
  const { t } = useTranslation();
  const gridEl = useRef<HTMLDivElement | null>(null);
  const rowEls = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [preview, setPreview] = useState<RowLayout[] | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; label: string } | null>(null);

  // The arrival animation plays once, when the dashboard opens. After that it is switched off, so a card
  // that changes row while being dragged does not fade in again.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), 1500);
    return () => window.clearTimeout(id);
  }, []);

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
    e.stopPropagation(); // the card underneath must not start a move
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
    const pair = a.w + b.w;
    // Smallest weight either card may take: the readable minimum width, but never more than half the pair.
    const lo = Math.min(Math.max(MIN_WEIGHT, (MIN_CARD_PX / width) * total), pair / 2);
    let latest = snapshot;
    const move = (ev: PointerEvent) => {
      const na = clamp(a.w + ((ev.clientX - x0) / width) * total, lo, pair - lo);
      const nb = pair - na;
      latest = snapshot.map(r => r.id !== rowId ? r : {
        ...r, cards: r.cards.map(c => c.id === aId ? { ...c, w: na } : c.id === bId ? { ...c, w: nb } : c),
      });
      onChange(latest, false);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.cursor = '';
      onChange(latest, true);
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const equalise = (rowId: string) => {
    onChange(rows.map(r => r.id !== rowId ? r : { ...r, cards: r.cards.map(c => ({ ...c, w: 1 })) }), true);
  };

  // ── Move: press a card, drag; the other cards slide aside to show where it lands ──
  // Pointer-based (the browser's native drag-and-drop is unreliable inside Electron).
  const startMove = (e: React.PointerEvent, cardId: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const cell = e.currentTarget as HTMLElement;
    const label = cell.querySelector('.aw-card-title, .aw-label')?.textContent || t('Card');
    const state: { active: boolean; dest: Dest | null } = { active: false, dest: null };

    // The card under the pointer (or the nearest one when the pointer is in a gap) decides the drop:
    // top / bottom edge = a new row above / below it; left / right half = beside it.
    const locate = (x: number, y: number): Dest | null => {
      const cells = Array.from(gridEl.current?.querySelectorAll<HTMLElement>('[data-bento-cell]') ?? []);
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
      // A full row takes no more cards: the card gets a row of its own next to it instead.
      const targetRow = rows.find(row => row.cards.some(c => c.id === id));
      const others = targetRow ? targetRow.cards.filter(c => c.id !== cardId && !hidden.has(c.id)).length : 0;
      if (others >= MAX_PER_ROW) return { targetId: id, row: ry < 0.5 ? 'above' : 'below' };
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
      window.removeEventListener('pointercancel', up);
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
    window.addEventListener('pointercancel', up);
  };

  let cellIndex = 0;

  return (
    <div ref={gridEl} className={`bento-grid${settled ? ' is-settled' : ''}`}>
      {visibleRows.map(({ row, cards }) => (
        <div
          key={row.id}
          ref={el => { rowEls.current[row.id] = el; }}
          className="bento-row"
          data-n={cards.length}
          style={{ ['--cols' as any]: cards.map(c => `minmax(0, ${c.w}fr)`).join(' ') }}
        >
          {cards.map((card, ci) => {
            const next = cards[ci + 1];
            const dragging = dragId === card.id;
            const n = cellIndex++;
            const i = Math.min(n, 14);
            const withArt = !!artUrl && artCards.has(card.id);
            return (
              <div
                key={card.id}
                className={`bento-cell${editing ? ' is-editing' : ''}${dragging ? ' is-dragging' : ''}${withArt ? ' has-art' : ''}`}
                data-bento-cell={card.id}
                style={{
                  ['--i' as any]: i,
                  // Each card shows a different part of the picture, so neighbouring cards do not look identical.
                  ...(withArt ? { ['--card-art' as any]: `url("${artUrl}")`, ['--card-art-x' as any]: `${(n * 37) % 101}%` } : {}),
                }}
                onPointerDown={editing ? e => startMove(e, card.id) : undefined}
                aria-label={editing ? t('Drag to move this card') : undefined}
              >
                <div className="bento-inner">
                  {renderCard(card.id)}
                </div>

                {editing && <span className="bento-grip" aria-hidden><GripHorizontal size={12} /></span>}

                {editing && !dragId && artUrl && (
                  <button
                    type="button" className={`bento-art-btn${withArt ? ' is-on' : ''}`}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => onToggleArt(card.id)}
                    aria-pressed={withArt}
                    aria-label={withArt ? t('Remove the picture from this card') : t('Show the picture inside this card')}
                  >
                    <ImageIcon size={13} />
                  </button>
                )}

                {editing && !dragId && (
                  <button
                    type="button" className="bento-hide"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => onHide(card.id)}
                    aria-label={t('Remove this card from the dashboard')}
                  >
                    <X size={13} />
                  </button>
                )}

                {editing && next && !dragId && (
                  <div
                    className="bento-split"
                    role="separator" aria-orientation="vertical" aria-label={t('Drag to resize')}
                    onPointerDown={e => startSplit(e, row.id, card.id, next.id)}
                    onDoubleClick={() => equalise(row.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {ghost && (
        <div className="dash-ghost" style={{ left: ghost.x + 14, top: ghost.y + 14 }}>
          <GripHorizontal size={14} /> {ghost.label}
        </div>
      )}
    </div>
  );
};

export default BentoGrid;

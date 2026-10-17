import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import type { User } from '../../auth/types/auth.types';
import { stepText, TourStep } from './tourSteps';
import { Box, Pt, scribbleArrow, scribbleBox, scribbleCircle, scribbleUnderline } from './doodle';
import { prefersCalm, useCalm } from './calm';
import { useFocusTrap } from './useFocusTrap';
import { useGlass } from './useGlass';
import './onboarding.css';

const CARD_W = 340;

/** Types the text out letter by letter (all at once when the OS asks for reduced motion). */
const useTyped = (text: string, ms = 28) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (prefersCalm()) { setN(text.length); return; }
    setN(0);
    const id = window.setInterval(() => setN((v) => (v >= text.length ? (window.clearInterval(id), v) : v + 1)), ms);
    return () => window.clearInterval(id);
  }, [text, ms]);
  return text.slice(0, n);
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Point where the line from the centre of `b` towards `toward` leaves the box. */
const edgePoint = (b: Box, toward: Pt): Pt => {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const dx = toward.x - cx, dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const t = Math.min(dx !== 0 ? b.w / 2 / Math.abs(dx) : Infinity, dy !== 0 ? b.h / 2 / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t };
};

/** Puts the caption on the side of the target that has room, then keeps it on screen. */
const placeCard = (r: Box, cw: number, ch: number, vw: number, vh: number): Pt => {
  const gap = 72, m = 16;
  const options: Pt[] = [
    { x: r.x + r.w / 2 - cw / 2, y: r.y + r.h + gap },
    { x: r.x + r.w / 2 - cw / 2, y: r.y - gap - ch },
    { x: r.x + r.w + gap, y: r.y + r.h / 2 - ch / 2 },
    { x: r.x - gap - cw, y: r.y + r.h / 2 - ch / 2 },
  ];
  const fits = (o: Pt) => o.x >= m && o.y >= m && o.x + cw <= vw - m && o.y + ch <= vh - m;
  const pick = options.find(fits) ?? { x: vw - cw - m, y: vh - ch - m };
  return { x: clamp(pick.x, m, Math.max(m, vw - cw - m)), y: clamp(pick.y, m, Math.max(m, vh - ch - m)) };
};

export interface TourOverlayProps {
  steps: TourStep[];
  /** Words each caption for this person (role-based tours). */
  user: User;
  startIndex?: number;
  /** Called with each step id as it is shown, so the tour can resume where it stopped. */
  onStep: (id: string) => void;
  /** Skipped (X, Esc or the Skip link), with the step it was skipped on. */
  onClose: (stepId?: string) => void;
  /** Went past the last step. Defaults to onClose. */
  onDone?: () => void;
}

/**
 * The doodle tour: dims the dashboard, cuts a spotlight around the real element, draws a marker
 * scribble around it and a hand-drawn arrow from a handwritten caption card.
 */
export const TourOverlay: React.FC<TourOverlayProps> = ({ steps, user, startIndex = 0, onStep, onClose, onDone }) => {
  const [index, setIndex] = useState(clamp(startIndex, 0, steps.length - 1));
  const [rect, setRect] = useState<Box | null>(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [cardH, setCardH] = useState(190);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const glass = useGlass();
  const calm = useCalm();
  const rootRef = useFocusTrap<HTMLDivElement>();
  const step = steps[index];
  const last = index === steps.length - 1;

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    const r = el?.getBoundingClientRect();
    setVp({ w: window.innerWidth, h: window.innerHeight });
    if (r && r.width > 0 && r.height > 0) setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, [step]);

  // New step: bring the element into view, then measure it (and keep measuring on resize/scroll).
  useEffect(() => {
    if (!step) return;
    document.querySelector(step.target)?.scrollIntoView({ block: 'center', inline: 'nearest' });
    measure();
    const t = window.setTimeout(measure, 120); // layout may settle after the scroll
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    onStep(step.id);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, measure, onStep]);

  useLayoutEffect(() => {
    const h = cardRef.current?.getBoundingClientRect().height;
    if (h && Math.abs(h - cardH) > 1) setCardH(h);
  });

  const skip = useCallback(() => onClose(step?.id), [onClose, step]);
  const next = useCallback(() => (last ? (onDone ?? onClose)() : setIndex((i) => i + 1)), [last, onClose, onDone]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      else if (e.key === 'Escape') { e.preventDefault(); skip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, skip]);

  useEffect(() => { nextRef.current?.focus(); }, [index]);

  const typedTitle = useTyped(step?.title ?? '');
  if (!step) return null;

  const pos = rect ? placeCard(rect, CARD_W, cardH, vp.w, vp.h) : { x: vp.w / 2 - CARD_W / 2, y: vp.h / 2 - cardH / 2 };
  let highlight = '';
  let arrow: { shaft: string; head: string } | null = null;
  if (rect) {
    highlight = step.doodle === 'circle' ? scribbleCircle(rect, step.id)
      : step.doodle === 'underline' ? scribbleUnderline(rect, step.id)
      : scribbleBox(rect, step.id);
    const card: Box = { x: pos.x, y: pos.y, w: CARD_W, h: cardH };
    const target: Box = { x: rect.x - 14, y: rect.y - 14, w: rect.w + 28, h: rect.h + 28 };
    const from = edgePoint({ x: card.x - 4, y: card.y - 4, w: card.w + 8, h: card.h + 8 }, { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
    const to = edgePoint(target, { x: card.x + card.w / 2, y: card.y + card.h / 2 });
    if (Math.hypot(to.x - from.x, to.y - from.y) > 36) arrow = scribbleArrow(from, to, step.id);
  }

  return (
    <div className={`ob-tour${calm ? ' ob-calm' : ''}`} style={glass} ref={rootRef} role="dialog" aria-modal="true" aria-label="Guided tour">
      <span className="ob-sr" aria-live="polite">Step {index + 1} of {steps.length}: {step.title}. {stepText(step, user)}</span>
      <svg className="ob-tour-svg" width={vp.w} height={vp.h} aria-hidden="true">
        <defs>
          <mask id="ob-tour-mask">
            <rect x="0" y="0" width={vp.w} height={vp.h} fill="#fff" />
            {rect && <rect className="ob-hole" x={rect.x - 6} y={rect.y - 6} width={rect.w + 12} height={rect.h + 12} rx="10" fill="#000" />}
          </mask>
        </defs>
        <rect x="0" y="0" width={vp.w} height={vp.h} fill="rgba(8,12,20,.66)" mask="url(#ob-tour-mask)" />
        {rect && (
          <g key={step.id} className="ob-doodle">
            <path className="ob-draw" pathLength={1} d={highlight} style={{ ['--d' as any]: '.05s' }} />
            {arrow && (
              <>
                <path className="ob-draw" pathLength={1} d={arrow.shaft} style={{ ['--d' as any]: '.5s' }} />
                <path className="ob-draw" pathLength={1} d={arrow.head} style={{ ['--d' as any]: '1s', ['--t' as any]: '.25s' }} />
              </>
            )}
          </g>
        )}
      </svg>

      <div ref={cardRef} key={step.id} className="ob-dialog ob-tour-card" style={{ left: pos.x, top: pos.y, width: CARD_W }}>
        <button type="button" className="ob-tour-x" onClick={skip} aria-label="Skip tour"><X size={16} /></button>
        <div className="ob-hand ob-tour-title" aria-label={step.title}>
          <span className="ob-tour-ghost">{step.title}</span>
          <span className="ob-tour-typed" aria-hidden="true">{typedTitle}</span>
        </div>
        <p className="ob-hand ob-tour-text">{stepText(step, user)}</p>
        <div className="ob-tour-foot">
          <span className="ob-tour-count">{index + 1} / {steps.length}</span>
          <div className="ob-footer-actions">
            {index > 0 && <button type="button" className="ob-btn ob-btn-secondary" onClick={back}><ArrowLeft size={14} /> Back</button>}
            <button type="button" ref={nextRef} className="ob-btn ob-btn-primary" onClick={next}>
              {last ? <>Done <Check size={14} /></> : <>Next <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
        <button type="button" className="ob-tour-skip" onClick={skip}>Skip tour</button>
      </div>
    </div>
  );
};

export default TourOverlay;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import type { User } from '../../../auth/types/auth.types';
import { useCalm } from '../calm';
import { useFocusTrap } from '../useFocusTrap';
import { useGlass } from '../useGlass';
import '../onboarding.css';

export interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  body: React.ReactNode;
  /** Hide the slide for people whose rights do not include the topic. */
  enabled?: (user: User) => boolean;
  /** One line under the diagram, for caveats. */
  note?: string;
}

export interface SlideDeckProps {
  /** Small label at the top, e.g. "How it works" or "What's new". */
  heading: string;
  icon: React.ReactNode;
  slides: Slide[];
  onClose: () => void;
  /** Called once, when the last slide has been reached. */
  onComplete?: () => void;
  doneLabel?: string;
}

/**
 * Full-screen slide presentation: Back/Next, dots, keyboard (arrows, Esc) and a Skip button.
 * Used for the "How it works" slides, and reusable for a What's New popup.
 */
export const SlideDeck: React.FC<SlideDeckProps> = ({ heading, icon, slides, onClose, onComplete, doneLabel = 'Done' }) => {
  const [index, setIndex] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const glass = useGlass();
  const calm = useCalm();
  const dialogRef = useFocusTrap<HTMLDivElement>();
  const completed = useRef(false);
  const slide = slides[index];
  const last = index === slides.length - 1;

  const next = useCallback(() => (last ? onClose() : setIndex((i) => i + 1)), [last, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, onClose]);

  useEffect(() => { nextRef.current?.focus(); }, [index]);
  useEffect(() => {
    if (last && !completed.current) { completed.current = true; onComplete?.(); }
  }, [last, onComplete]);

  if (!slide) return null;

  return (
    <div className={`ob-overlay ob-top${calm ? ' ob-calm' : ''}`} style={glass} role="dialog" aria-modal="true" aria-labelledby="ob-deck-title">
      <div className="ob-dialog ob-deck" ref={dialogRef}>
        <div className="ob-hero">
          <div className="ob-icon">{icon}</div>
          <div>
            <p className="ob-eyebrow">{heading}</p>
            <h2 className="ob-title" id="ob-deck-title" aria-live="polite">{slide.title}</h2>
            {slide.subtitle && <p className="ob-subtitle">{slide.subtitle}</p>}
          </div>
          <div className="ob-hero-end">
            <span className="ob-pill">{index + 1} / {slides.length}</span>
            <button type="button" className="ob-tour-x ob-deck-x" onClick={onClose} aria-label="Close slides"><X size={16} /></button>
          </div>
        </div>

        <div className="ob-stage">
          <div className="ob-step ob-slide" key={slide.id}>
            {slide.body}
            {slide.note && <p className="ob-slide-note">{slide.note}</p>}
          </div>
        </div>

        <div className="ob-footer">
          <div className="ob-dots" aria-hidden="true">
            {slides.map((s, i) => (
              <button key={s.id} type="button" tabIndex={-1} className={`ob-dot ${i === index ? 'is-current' : i < index ? 'is-done' : ''}`}
                onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
          <div className="ob-footer-actions">
            {!last && <button type="button" className="ob-btn ob-btn-ghost" onClick={onClose}>Skip</button>}
            {index > 0 && <button type="button" className="ob-btn ob-btn-secondary" onClick={back}><ArrowLeft size={14} /> Back</button>}
            <button type="button" ref={nextRef} className="ob-btn ob-btn-primary" onClick={next}>
              {last ? <>{doneLabel} <Check size={14} /></> : <>Next <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideDeck;

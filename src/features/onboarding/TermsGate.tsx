import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { onboardingApi, TermsDocument } from './onboardingApi';
import { useCalm } from './calm';
import { useFocusTrap } from './useFocusTrap';
import { useGlass } from './useGlass';
import './onboarding.css';

/** Splits the plain-text terms into a title-less list of {heading?, body} blocks ("1. Heading" lines become headings). */
const toBlocks = (text: string) =>
  text.split(/\n\s*\n/).map((raw) => {
    const lines = raw.trim().split('\n');
    const first = lines[0] ?? '';
    const isHeading = /^\d+\.\s/.test(first) && lines.length > 1;
    return isHeading
      ? { heading: first, body: lines.slice(1).join(' ') }
      : { heading: '', body: raw.trim() };
  }).filter((b) => b.body || b.heading);

/**
 * Blocking Terms & Conditions dialog. There is no close button: the only ways out are to
 * accept (recorded with the version and time) or to decline, which logs the user out.
 * The checkbox unlocks once the text has been scrolled to the end.
 */
export const TermsGate: React.FC<{ onAccepted: () => void; onDecline: () => void }> = ({ onAccepted, onDecline }) => {
  const [doc, setDoc] = useState<TermsDocument | null>(null);
  const [error, setError] = useState('');
  const [readAll, setReadAll] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pct, setPct] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const glass = useGlass();
  const calm = useCalm();
  const dialogRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    onboardingApi.terms()
      .then(setDoc)
      .catch(() => setError('Could not load the Terms and Conditions. Please check the connection and try again.'));
  }, []);

  const blocks = useMemo(() => (doc ? toBlocks(doc.text) : []), [doc]);

  const checkScrolled = () => {
    const el = bodyRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setPct(max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100)));
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadAll(true);
  };
  // Short text that fits without scrolling counts as read.
  useEffect(() => { if (doc) checkScrolled(); }, [doc]);

  const accept = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      await onboardingApi.acceptTerms(doc.version);
      onAccepted();
    } catch (e: any) {
      setError(e?.message || 'Could not record your acceptance. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className={`ob-overlay ob-top${calm ? ' ob-calm' : ''}`} style={glass} role="dialog" aria-modal="true" aria-labelledby="ob-terms-title">
      <div className="ob-dialog ob-wide" ref={dialogRef}>
        <div className="ob-hero">
          <div className="ob-icon"><ScrollText size={22} /></div>
          <div>
            <h2 className="ob-title" id="ob-terms-title">Terms and Conditions</h2>
            <p className="ob-subtitle">Please read and accept to continue</p>
          </div>
          {doc && <div className="ob-hero-end"><span className="ob-pill">Version {doc.version}</span></div>}
        </div>

        <div className="ob-progress" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <div ref={bodyRef} onScroll={checkScrolled} className="ob-terms" tabIndex={0} role="region" aria-label="Terms and Conditions text. Scroll to the end to enable the agreement checkbox.">
          {doc
            ? blocks.map((b, i) => (
                <React.Fragment key={i}>
                  {b.heading && <h4>{b.heading}</h4>}
                  <p className={b.heading ? '' : 'is-strong'}>{b.body}</p>
                </React.Fragment>
              ))
            : <p>{error || 'Loading…'}</p>}
        </div>

        <div className="ob-footer">
          <div>
            {error && doc && <div className="ob-note is-error" role="alert">{error}</div>}
            {!(error && doc) && (
              <label className={`ob-check ${readAll ? '' : 'is-disabled'}`}>
                <input type="checkbox" disabled={!readAll} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                {readAll ? 'I have read and agree to these terms' : 'Scroll to the end to continue'}
              </label>
            )}
          </div>
          <div className="ob-footer-actions">
            <button type="button" className="ob-btn ob-btn-danger" onClick={onDecline}>Decline and log out</button>
            <button type="button" className="ob-btn ob-btn-primary" onClick={accept} disabled={!doc || !agreed || saving}>
              {saving ? 'Saving…' : 'Accept and continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsGate;

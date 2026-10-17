import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Presentation } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import {
  markProgress, ONBOARDING_REPLAY_EVENT, ONBOARDING_SLIDES_EVENT, onboardingApi, OnboardingStatus, trackEvent,
} from './onboardingApi';
import { ONBOARDING_STEPS, OnboardingStep } from './steps';
import TermsGate from './TermsGate';
import TourOverlay from './TourOverlay';
import ChecklistWidget from './ChecklistWidget';
import SlideDeck from './slides/SlideDeck';
import { HOW_IT_WORKS_SLIDES } from './slides/howItWorksSlides';
import { availableTourSteps, TOUR_STEP_PREFIX, TourStep } from './tourSteps';
import { useCalm } from './calm';
import { useFocusTrap } from './useFocusTrap';
import { useGlass } from './useGlass';
import './onboarding.css';

const APP_VERSION: string | undefined = (window as any).electronAPI?.appVersion;
const SESSION_FLAG = 'onboarding.autostartSession';
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

/**
 * Runs the walkthrough. Mounted once in the dashboard (main) window, so tool windows never
 * show it. It starts by itself at most once per login, according to the effective mode
 * (global default or the user's own override), and on demand through Help > Replay Tour.
 * Terms and Conditions come first and are independent of that mode. The getting-started
 * checklist (a small pill) lives here too, so it is shown only while no dialog is open.
 */
export const OnboardingHost: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const glass = useGlass();
  const calm = useCalm();
  const [steps, setSteps] = useState<OnboardingStep[] | null>(null); // null = closed
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});
  const [termsPending, setTermsPending] = useState(false);
  const [quiet, setQuiet] = useState(false); // the person turned the tour off: no checklist pill either
  const [tour, setTour] = useState<{ steps: TourStep[]; index: number } | null>(null);
  // The slides: opened after the tour, or on demand from Help > How It Works. `inWalkthrough` decides what closing does.
  const [deck, setDeck] = useState<{ inWalkthrough: boolean } | null>(null);
  const walkthroughWanted = useRef(false);
  const statusRef = useRef<OnboardingStatus | null>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(!!steps && !termsPending && !tour && !deck);

  // The step list is fixed when the walkthrough opens, so finishing it (which marks the user as
  // "completed") cannot remove steps from under them mid-way.
  const start = useCallback((event: 'start' | 'replay' = 'start') => {
    if (!user) return;
    const list = ONBOARDING_STEPS.filter((s) => !s.enabled || s.enabled(user, statusRef.current));
    if (list.length === 0) return;
    trackEvent(event);
    trackEvent('dialog_step', list[0]?.id);
    setIndex(0);
    setDontShowAgain(false);
    setDoneSteps({});
    setSteps(list);
  }, [user]);

  // The doodle tour points at the real dashboard, so it closes the dialog and takes over the screen.
  const startTour = useCallback((resumeId?: string) => {
    if (!user) return false;
    const list = availableTourSteps(user);
    if (list.length === 0) return false;
    const at = resumeId ? list.findIndex((t) => t.id === resumeId) : 0;
    setSteps(null);
    setTour({ steps: list, index: Math.max(0, at) });
    return true;
  }, [user]);

  // Walkthrough auto-start: once per login. sessionStartTime changes on every login, so a
  // reload of the same session does not show it again, but a new login does.
  const autostart = useCallback((shouldShow: boolean, lastStep?: string | null) => {
    if (!shouldShow) return;
    const sessionId = localStorage.getItem('sessionStartTime') || 'unknown';
    try {
      if (sessionStorage.getItem(SESSION_FLAG) === sessionId) return;
      sessionStorage.setItem(SESSION_FLAG, sessionId);
    } catch { /* storage unavailable: worst case it is checked again */ }
    // Quit half-way through the tour last time: pick it up where it stopped (after the page has drawn).
    if (lastStep?.startsWith(TOUR_STEP_PREFIX)) {
      window.setTimeout(() => { if (!startTour(lastStep.slice(TOUR_STEP_PREFIX.length))) start(); }, 700);
      return;
    }
    start();
  }, [start, startTour]);

  // Terms are checked on every start of the window (not once per login), so an unaccepted or
  // newly published version can never be skipped by reloading. The walkthrough waits for them.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let cancelled = false;
    onboardingApi.status()
      .then((s) => {
        if (cancelled || !s) return;
        statusRef.current = s;
        walkthroughWanted.current = !!s.shouldShow;
        setQuiet(s.effectiveMode === 'never');
        if (s.terms && !s.terms.accepted) setTermsPending(true);
        else autostart(!!s.shouldShow, s.lastStep);
      })
      .catch(() => undefined); // a failed check must never block the dashboard
    return () => { cancelled = true; };
  }, [isAuthenticated, user, autostart]);

  const onTermsAccepted = () => {
    setTermsPending(false);
    autostart(walkthroughWanted.current, statusRef.current?.lastStep);
  };

  useEffect(() => {
    const replay = () => start('replay');
    const openSlides = () => setDeck({ inWalkthrough: false });
    window.addEventListener(ONBOARDING_REPLAY_EVENT, replay);
    window.addEventListener(ONBOARDING_SLIDES_EVENT, openSlides);
    return () => {
      window.removeEventListener(ONBOARDING_REPLAY_EVENT, replay);
      window.removeEventListener(ONBOARDING_SLIDES_EVENT, openSlides);
    };
  }, [start]);

  // Finished or skipped both use up the "first login"; "don't show again" also turns it off.
  const finish = useCallback(async () => {
    setSteps(null);
    setTour(null);
    setDeck(null);
    if (statusRef.current) statusRef.current = { ...statusRef.current, completedAt: new Date().toISOString() };
    try {
      await onboardingApi.complete(APP_VERSION);
      if (dontShowAgain) { await onboardingApi.setPreference('never'); setQuiet(true); }
    } catch { /* it will simply be offered again next time */ }
  }, [dontShowAgain]);

  const onTourStep = useCallback((id: string) => {
    trackEvent('tour_step', id);
    onboardingApi.saveStep(TOUR_STEP_PREFIX + id).catch(() => undefined);
  }, []);

  // Keyboard: Left / Right move through the dialog's steps (not while typing in a field).
  const dialogOpen = !!steps && !termsPending && !tour && !deck;
  const keyNav = useRef<{ back: () => void; next: () => void }>({ back: () => undefined, next: () => undefined });
  useEffect(() => {
    if (!dialogOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); keyNav.current.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); keyNav.current.back(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen]);

  let content: React.ReactNode = null;

  if (termsPending && user) {
    content = <TermsGate onAccepted={onTermsAccepted} onDecline={logout} />;
  } else if (deck && user) {
    // Opened on demand: just close. Opened by the walkthrough: closing ends it.
    content = (
      <SlideDeck heading="How it works" icon={<Presentation size={22} />} slides={HOW_IT_WORKS_SLIDES.filter((s) => !s.enabled || s.enabled(user))}
        onClose={deck.inWalkthrough ? finish : () => setDeck(null)} doneLabel={deck.inWalkthrough ? 'Finish' : 'Done'}
        onComplete={() => { trackEvent('slides_done'); markProgress('slides'); }} />
    );
  } else if (tour && user) {
    content = (
      <TourOverlay steps={tour.steps} user={user} startIndex={tour.index} onStep={onTourStep}
        onClose={(stepId) => { trackEvent('skip', stepId); finish(); }}
        onDone={() => { trackEvent('tour_done'); markProgress('tour'); setTour(null); setDeck({ inWalkthrough: true }); }} />
    );
  } else if (steps && user && steps[index]) {
    const step = steps[index]!;
    const last = index === steps.length - 1;
    const goTo = (n: number) => {
      setIndex(n);
      trackEvent('dialog_step', steps[n]?.id);
      onboardingApi.saveStep(steps[n]?.id ?? '').catch(() => undefined);
    };
    const tourReady = last && availableTourSteps(user).length > 0;
    const next = () => (last ? (tourReady ? startTour() : finish()) : goTo(index + 1));
    const back = () => { if (index > 0) goTo(index - 1); };
    keyNav.current = { next, back };
    const forwardLabel = tourReady ? 'Start tour' : last ? 'Finish' : step.skipLabel && !doneSteps[step.id] ? step.skipLabel : 'Next';

    content = (
      <div className={`ob-overlay${calm ? ' ob-calm' : ''}`} style={glass} role="dialog" aria-modal="true" aria-labelledby="ob-dialog-title">
        <div className="ob-dialog" ref={dialogRef}>
          <div className="ob-hero">
            <div className="ob-icon">{step.icon}</div>
            <div>
              <h2 className="ob-title" id="ob-dialog-title">{step.title}</h2>
              {step.subtitle && <p className="ob-subtitle">{step.subtitle}</p>}
            </div>
            <div className="ob-hero-end">
              <div className="ob-dots" aria-hidden="true">
                {steps.map((s, i) => (
                  <span key={s.id} className={`ob-dot ${i === index ? 'is-current' : i < index ? 'is-done' : ''}`} />
                ))}
              </div>
              <span className="ob-sr" aria-live="polite">Step {index + 1} of {steps.length}: {step.title}</span>
            </div>
          </div>

          <div className="ob-body">
            <div className="ob-step" key={step.id}>
              {step.render({ user, next, setDone: (d) => setDoneSteps((m) => ({ ...m, [step.id]: d })) })}
            </div>
          </div>

          <div className="ob-footer">
            <label className="ob-check">
              <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
              Don&apos;t show this again
            </label>
            <div className="ob-footer-actions">
              <button type="button" className="ob-btn ob-btn-ghost" onClick={() => { trackEvent('skip', step.id); finish(); }}>Skip tour</button>
              {index > 0 && <button type="button" className="ob-btn ob-btn-secondary" onClick={back}>Back</button>}
              <button type="button" className="ob-btn ob-btn-primary" onClick={next}>{forwardLabel}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      {user && <ChecklistWidget suspended={!!content || termsPending} quiet={quiet} />}
    </>
  );
};

export default OnboardingHost;

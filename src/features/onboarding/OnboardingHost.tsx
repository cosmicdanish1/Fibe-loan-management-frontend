import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { ONBOARDING_REPLAY_EVENT, ONBOARDING_SLIDES_EVENT, onboardingApi, OnboardingStatus } from './onboardingApi';
import { ONBOARDING_STEPS, OnboardingStep } from './steps';
import TermsGate from './TermsGate';
import TourOverlay from './TourOverlay';
import SlideDeck from './slides/SlideDeck';
import { HOW_IT_WORKS_SLIDES } from './slides/howItWorksSlides';
import { availableTourSteps, TOUR_STEP_PREFIX, TourStep } from './tourSteps';
import { Presentation } from 'lucide-react';
import { useGlass } from './useGlass';
import './onboarding.css';

const APP_VERSION: string | undefined = (window as any).electronAPI?.appVersion;
const SESSION_FLAG = 'onboarding.autostartSession';

/**
 * Runs the walkthrough. Mounted once in the dashboard (main) window, so tool windows never
 * show it. It starts by itself at most once per login, according to the effective mode
 * (global default or the user's own override), and on demand through Help > Replay Tour.
 * Terms and Conditions come first and are independent of that mode.
 */
export const OnboardingHost: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const glass = useGlass();
  const [steps, setSteps] = useState<OnboardingStep[] | null>(null); // null = closed
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});
  const [termsPending, setTermsPending] = useState(false);
  const [tour, setTour] = useState<{ steps: TourStep[]; index: number } | null>(null);
  // The slides: opened after the tour, or on demand from Help > How It Works. `inWalkthrough` decides what closing does.
  const [deck, setDeck] = useState<{ inWalkthrough: boolean } | null>(null);
  const walkthroughWanted = useRef(false);
  const statusRef = useRef<OnboardingStatus | null>(null);

  // The step list is fixed when the walkthrough opens, so finishing it (which marks the user as
  // "completed") cannot remove steps from under them mid-way.
  const start = useCallback(() => {
    if (!user) return;
    const list = ONBOARDING_STEPS.filter((s) => !s.enabled || s.enabled(user, statusRef.current));
    if (list.length === 0) return;
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
    const openSlides = () => setDeck({ inWalkthrough: false });
    window.addEventListener(ONBOARDING_REPLAY_EVENT, start);
    window.addEventListener(ONBOARDING_SLIDES_EVENT, openSlides);
    return () => {
      window.removeEventListener(ONBOARDING_REPLAY_EVENT, start);
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
      if (dontShowAgain) await onboardingApi.setPreference('never');
    } catch { /* it will simply be offered again next time */ }
  }, [dontShowAgain]);

  const onTourStep = useCallback((id: string) => { onboardingApi.saveStep(TOUR_STEP_PREFIX + id).catch(() => undefined); }, []);

  if (termsPending && user) return <TermsGate onAccepted={onTermsAccepted} onDecline={logout} />;
  if (deck && user) {
    // Opened on demand: just close. Opened by the walkthrough: closing ends it.
    return <SlideDeck heading="How it works" icon={<Presentation size={22} />} slides={HOW_IT_WORKS_SLIDES.filter((s) => !s.enabled || s.enabled(user))}
      onClose={deck.inWalkthrough ? finish : () => setDeck(null)} doneLabel={deck.inWalkthrough ? 'Finish' : 'Done'} />;
  }
  if (tour && user) {
    return <TourOverlay steps={tour.steps} user={user} startIndex={tour.index} onStep={onTourStep} onClose={finish}
      onDone={() => { setTour(null); setDeck({ inWalkthrough: true }); }} />;
  }
  if (!steps || !user) return null;
  const step = steps[index];
  if (!step) return null;
  const last = index === steps.length - 1;

  const goTo = (n: number) => {
    setIndex(n);
    onboardingApi.saveStep(steps[n]?.id ?? '').catch(() => undefined);
  };
  const tourReady = last && availableTourSteps(user).length > 0;
  const next = () => (last ? (tourReady ? startTour() : finish()) : goTo(index + 1));
  const forwardLabel = tourReady ? 'Start tour' : last ? 'Finish' : step.skipLabel && !doneSteps[step.id] ? step.skipLabel : 'Next';

  return (
    <div className="ob-overlay" style={glass} role="dialog" aria-modal="true" aria-label="Welcome walkthrough">
      <div className="ob-dialog">
        <div className="ob-hero">
          <div className="ob-icon">{step.icon}</div>
          <div>
            <h2 className="ob-title">{step.title}</h2>
            {step.subtitle && <p className="ob-subtitle">{step.subtitle}</p>}
          </div>
          <div className="ob-hero-end" aria-label={`Step ${index + 1} of ${steps.length}`}>
            <div className="ob-dots">
              {steps.map((s, i) => (
                <span key={s.id} className={`ob-dot ${i === index ? 'is-current' : i < index ? 'is-done' : ''}`} />
              ))}
            </div>
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
            <button type="button" className="ob-btn ob-btn-ghost" onClick={finish}>Skip tour</button>
            {index > 0 && <button type="button" className="ob-btn ob-btn-secondary" onClick={() => goTo(index - 1)}>Back</button>}
            <button type="button" className="ob-btn ob-btn-primary" onClick={next}>{forwardLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingHost;

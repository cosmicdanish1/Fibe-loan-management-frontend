import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ListChecks, X } from 'lucide-react';
import {
  ChecklistItemId, ChecklistStatus, markProgress, ONBOARDING_CHECKLIST_EVENT, ONBOARDING_PROGRESS_EVENT,
  ONBOARDING_REPLAY_EVENT, ONBOARDING_SLIDES_EVENT, onboardingApi,
} from './onboardingApi';
import { useCalm } from './calm';
import { useGlass } from './useGlass';
import './onboarding.css';

const openWindow = (route: string) => {
  const api = (window as any).electronAPI;
  if (api?.openNewWindow) api.openNewWindow(route);
  else window.location.hash = `#${route}`;
};
const fire = (name: string) => () => window.dispatchEvent(new Event(name));

interface ItemInfo {
  label: string;
  hint: (s: ChecklistStatus) => string;
  action?: { label: string; run: () => void };
}

const ITEMS: Record<ChecklistItemId, ItemInfo> = {
  terms: { label: 'Accept the terms', hint: () => 'Done when you accept them at sign-in.' },
  profile: { label: 'See your profile', hint: () => 'It is part of the welcome tour.', action: { label: 'Open', run: fire(ONBOARDING_REPLAY_EVENT) } },
  password: { label: 'Choose your own password', hint: () => 'Replace the one you were given.', action: { label: 'Change', run: () => openWindow('/change-password') } },
  twofa: { label: 'Set up two-factor sign-in', hint: () => 'Add an authenticator app for extra safety.', action: { label: 'Set up', run: () => openWindow('/my-profile') } },
  tour: { label: 'Take the guided tour', hint: () => 'Hand-drawn pointers around the screen.', action: { label: 'Start', run: fire(ONBOARDING_REPLAY_EVENT) } },
  slides: { label: 'Watch how it works', hint: () => 'Slides on loans, recoveries and day-end.', action: { label: 'Watch', run: fire(ONBOARDING_SLIDES_EVENT) } },
  windows: { label: 'Open three windows', hint: (s) => `${Math.min(s.windowsOpened, s.windowsNeeded)} of ${s.windowsNeeded} opened. Use the menus at the top.` },
};

const RING = 2 * Math.PI * 11;

/**
 * "Getting started" checklist: a small glass pill at the bottom-left of the dashboard that opens
 * a panel of first steps with progress. Hidden once everything is done, once the person hides it,
 * and when they have switched the welcome tour off. Help > Getting Started always brings it back.
 */
export const ChecklistWidget: React.FC<{ suspended: boolean; quiet: boolean }> = ({ suspended, quiet }) => {
  const [data, setData] = useState<ChecklistStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const glass = useGlass();
  const calm = useCalm();

  const load = useCallback(() => { onboardingApi.checklist().then(setData).catch(() => undefined); }, []);
  useEffect(() => {
    load();
    window.addEventListener(ONBOARDING_PROGRESS_EVENT, load);
    return () => window.removeEventListener(ONBOARDING_PROGRESS_EVENT, load);
  }, [load]);

  // Help > Getting Started: show it even if hidden before.
  useEffect(() => {
    const show = () => {
      setForced(true);
      onboardingApi.showChecklist().then((d) => { setData(d); setOpen(true); }).catch(() => setOpen(true));
    };
    window.addEventListener(ONBOARDING_CHECKLIST_EVENT, show);
    return () => window.removeEventListener(ONBOARDING_CHECKLIST_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  if (suspended || !data) return null;
  const finished = data.doneCount >= data.total;
  if (!forced && (data.dismissed || finished || quiet)) return null;

  const pct = Math.round((data.doneCount / data.total) * 100);

  return (
    <div className={`ob-cl${calm ? ' ob-calm' : ''}`} style={glass} ref={panelRef}>
      {open && (
        <div className="ob-cl-panel" role="dialog" aria-label="Getting started checklist">
          <div className="ob-cl-head">
            <div>
              <h3>Getting started</h3>
              <p>{finished ? 'All done. Nicely done!' : `${data.doneCount} of ${data.total} done`}</p>
            </div>
            <button type="button" className="ob-tour-x ob-cl-x" onClick={() => setOpen(false)} aria-label="Close checklist"><X size={16} /></button>
          </div>
          <div className="ob-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${pct}%` }} /></div>
          <ul className="ob-cl-list">
            {data.items.map((it) => {
              const info = ITEMS[it.id];
              return (
                <li key={it.id} className={it.done ? 'is-done' : ''}>
                  <span className="ob-cl-tick" aria-hidden="true">{it.done && <Check size={13} />}</span>
                  <div className="ob-cl-text">
                    <b>{info.label}<span className="ob-sr"> {it.done ? '(done)' : '(not done yet)'}</span></b>
                    <small>{info.hint(data)}</small>
                  </div>
                  {!it.done && info.action && (
                    <button type="button" className="ob-btn ob-btn-secondary ob-cl-go" onClick={() => { setOpen(false); info.action!.run(); }}>{info.action.label}</button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="ob-cl-foot">
            <button type="button" className="ob-btn ob-btn-ghost" onClick={() => { markProgress('dismissed'); setForced(false); setOpen(false); }}>
              Hide checklist
            </button>
            <span>Bring it back from Help › Getting Started</span>
          </div>
        </div>
      )}
      <button type="button" className="ob-cl-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Getting started, ${data.doneCount} of ${data.total} done`}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <circle className="ob-ring-bg" cx="14" cy="14" r="11" />
          <circle className="ob-ring-fg" cx="14" cy="14" r="11" strokeDasharray={RING} strokeDashoffset={RING * (1 - data.doneCount / data.total)} />
        </svg>
        <span className="ob-cl-label"><ListChecks size={14} /> Getting started</span>
        <span className="ob-pill">{data.doneCount}/{data.total}</span>
      </button>
    </div>
  );
};

export default ChecklistWidget;

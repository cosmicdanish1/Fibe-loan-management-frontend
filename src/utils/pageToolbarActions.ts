import { useEffect, useRef } from 'react';

// Each tool window (Loan Sanction, Loan Application, ...) is its own
// Electron process — there's no shared JS state between it and the
// Dashboard's toolbar. This hook reports the page's Save action to the main
// process, which tracks whichever tool window last had focus and relays its
// state to the Dashboard's SubNavbar (see main.ts "TOOLBAR REMOTE CONTROL").
export interface PageToolbarActions {
  onSave?: () => void;
  /** Legacy windows name their primary action differently per screen
   * ("Sanction", "Post", "Update"...) — the Dashboard toolbar shows this
   * instead of the hardcoded word "Save" when a page provides one. */
  saveLabel?: string;
  /** Mirrors the page's own button disabled state (e.g. no row selected yet,
   * already saving). Defaults to enabled whenever onSave is provided. */
  saveEnabled?: boolean;
}

/** Call from any tool-window page to wire its Save action into the
 * Dashboard's toolbar. A ref keeps the latest callback current without
 * re-registering just because the caller passed a new inline function;
 * re-registration only happens when label/enabled/handler-presence change. */
export function usePageToolbarActions(actions: PageToolbarActions): void {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const hasSave = !!actions.onSave;
  const saveLabel = actions.saveLabel;
  const saveEnabled = actions.saveEnabled;

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.registerToolbarState) return;

    api.registerToolbarState({
      hasSave,
      ...(saveLabel !== undefined && { saveLabel }),
      ...(saveEnabled !== undefined && { saveEnabled }),
    });

    const unsubscribe = api.onToolbarDoSave?.(() => {
      actionsRef.current.onSave?.();
    });

    // No explicit teardown on unmount: when this window closes, main.ts's
    // own 'closed' handler clears its toolbar state and target — doing it
    // here too would fire on every dependency change, not just real
    // unmounts, and flicker the Dashboard button disabled/enabled.
    return () => { unsubscribe?.(); };
  }, [hasSave, saveLabel, saveEnabled]);
}

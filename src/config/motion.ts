import { useEffect, useState } from 'react';

/**
 * Animation settings (ES-436).
 *
 *  - style:    how a window appears: Off, Fast fade, Slide or Zoom.
 *  - adaptive: let the app look at this PC and tone animation down when the PC is slow (recommended).
 *
 * Stored per PC in localStorage (shared by every window) and applied to <html> as data attributes that the
 * CSS in input.css reads:
 *   data-motion       = off | fade | slide | zoom   (what plays)
 *   data-motion-lite  = "1" when the PC is middling: every animation is kept very short
 *
 * "Calm mode" and the operating-system "reduce motion" setting always win and turn everything off.
 */

export type MotionStyle = 'off' | 'fade' | 'slide' | 'zoom';
export type PcTier = 'high' | 'mid' | 'low';

export const MOTION_STYLES: { id: MotionStyle; name: string; description: string }[] = [
  { id: 'fade',  name: 'Fast fade', description: 'Windows fade in quickly. Clean and light.' },
  { id: 'slide', name: 'Slide',     description: 'Windows glide up a few pixels while fading in.' },
  { id: 'zoom',  name: 'Zoom',      description: 'Windows grow gently from slightly smaller.' },
  { id: 'off',   name: 'Off',       description: 'No animation. Everything appears instantly.' },
];

export interface MotionPrefs { style: MotionStyle; adaptive: boolean }
export interface PcInfo { tier: PcTier; cores: number; memoryGb: number | null; avgFrameMs: number | null; measuredAt: number }
export interface MotionResolved { mode: MotionStyle; lite: boolean; reason: 'chosen' | 'calm' | 'system' | 'slow-pc' | 'mid-pc' }

export const MOTION_KEY = 'lms-motion';
export const PC_KEY = 'lms-motion-pc2'; // v2: earlier measurements taken during start-up were unreliable
export const CALM_KEY = 'onboarding.calm';
export const DEFAULT_MOTION: MotionPrefs = { style: 'fade', adaptive: true };
const CHANNEL = 'lms_motion';
const PC_MAX_AGE_MS = 24 * 3600 * 1000; // measured again every day

const isStyle = (v: unknown): v is MotionStyle => v === 'off' || v === 'fade' || v === 'slide' || v === 'zoom';

export const readMotion = (): MotionPrefs => {
  try {
    const raw = JSON.parse(localStorage.getItem(MOTION_KEY) || 'null');
    if (raw && isStyle(raw.style)) return { style: raw.style, adaptive: raw.adaptive !== false };
  } catch { /* storage unavailable or bad JSON */ }
  return { ...DEFAULT_MOTION };
};

/**
 * Pure: how capable is this PC, from what the browser reports and a frame-time measurement.
 * A slow frame time is only believed on a PC whose specs are also modest: a busy start-up (many files loading)
 * can slow frames on any machine, and a good PC must never be switched to "no animation" because of that.
 */
export const classifyPc = (cores: number, memoryGb: number | null, avgFrameMs: number | null): PcTier => {
  const weak = cores <= 4 || (memoryGb !== null && memoryGb <= 4);
  if (cores <= 2 || (memoryGb !== null && memoryGb <= 2)) return 'low';
  if (avgFrameMs !== null) {
    if (avgFrameMs > 28) return weak ? 'low' : 'mid';   // under ~36 fps
    if (avgFrameMs > 19) return weak ? 'mid' : 'high';  // under ~52 fps
  }
  if (weak) return 'mid';
  return 'high';
};

/** Pure: what actually plays, given the user's choice, the PC, and the accessibility switches. */
export const resolveMotion = (prefs: MotionPrefs, tier: PcTier, calm: boolean, systemReduce: boolean): MotionResolved => {
  if (calm) return { mode: 'off', lite: false, reason: 'calm' };
  if (systemReduce) return { mode: 'off', lite: false, reason: 'system' };
  if (prefs.style === 'off') return { mode: 'off', lite: false, reason: 'chosen' };
  if (prefs.adaptive && tier === 'low') return { mode: 'off', lite: false, reason: 'slow-pc' };
  if (prefs.adaptive && tier === 'mid') return { mode: 'fade', lite: true, reason: 'mid-pc' };
  return { mode: prefs.style, lite: false, reason: 'chosen' };
};

const readPcCache = (): PcInfo | null => {
  try {
    const p = JSON.parse(localStorage.getItem(PC_KEY) || 'null');
    if (p && typeof p.tier === 'string' && Date.now() - p.measuredAt < PC_MAX_AGE_MS) return p;
  } catch { /* ignore */ }
  return null;
};

const baseInfo = () => ({
  cores: Number(navigator.hardwareConcurrency) || 4,
  memoryGb: typeof (navigator as any).deviceMemory === 'number' ? (navigator as any).deviceMemory as number : null,
});

/** Median frame time over ~40 frames (the median ignores one-off hiccups). Null when the window is hidden. */
const measureFrames = (): Promise<number | null> => new Promise((resolve) => {
  if (document.visibilityState !== 'visible') return resolve(null);
  const deltas: number[] = []; let last = 0;
  const giveUp = setTimeout(() => resolve(null), 3000);
  const tick = (t: number) => {
    if (last) deltas.push(t - last);
    last = t;
    if (deltas.length >= 40) {
      clearTimeout(giveUp);
      deltas.sort((x, y) => x - y);
      resolve(deltas[Math.floor(deltas.length / 2)] ?? null);
    } else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

/** Best (lowest) of three measurements a second apart: the machine's real ability, not a busy moment. */
const measureBest = async (): Promise<number | null> => {
  let best: number | null = null;
  for (let i = 0; i < 3; i++) {
    const f = await measureFrames();
    if (f !== null && (best === null || f < best)) best = f;
    if (best !== null && best <= 19) break; // clearly fast: no need to measure again
    await new Promise(r => setTimeout(r, 1000));
  }
  return best;
};

let current: PcInfo = (() => {
  const cached = typeof localStorage !== 'undefined' ? readPcCache() : null;
  if (cached) return cached;
  const b = typeof navigator !== 'undefined' ? baseInfo() : { cores: 4, memoryGb: null };
  return { tier: classifyPc(b.cores, b.memoryGb, null), cores: b.cores, memoryGb: b.memoryGb, avgFrameMs: null, measuredAt: 0 };
})();
export const getPcInfo = (): PcInfo => current;

/** Measure this PC once a day (cached). Cheap: a second or two of frame timing, after start-up has settled. */
export const detectPc = async (force = false): Promise<PcInfo> => {
  if (!force) { const c = readPcCache(); if (c) { current = c; return c; } }
  const b = baseInfo();
  const frame = await measureBest();
  if (frame === null && !force) return current; // hidden window: try again in another window
  const info: PcInfo = { tier: classifyPc(b.cores, b.memoryGb, frame), cores: b.cores, memoryGb: b.memoryGb, avgFrameMs: frame === null ? null : Math.round(frame * 10) / 10, measuredAt: Date.now() };
  current = info;
  try { localStorage.setItem(PC_KEY, JSON.stringify(info)); } catch { /* ignore */ }
  emit();
  return info;
};

const calmOn = () => { try { return localStorage.getItem(CALM_KEY) === '1'; } catch { return false; } };
const systemReduce = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const currentResolved = (): MotionResolved => resolveMotion(readMotion(), current.tier, calmOn(), systemReduce());

const listeners = new Set<() => void>();
const emit = () => { applyMotion(); listeners.forEach(l => l()); };

/** Writes the result onto <html> and tells the desktop shell (so the native window fade follows it). */
export const applyMotion = (): MotionResolved => {
  const r = currentResolved();
  const el = document.documentElement;
  el.setAttribute('data-motion', r.mode);
  if (r.lite) el.setAttribute('data-motion-lite', '1'); else el.removeAttribute('data-motion-lite');
  try { (window as any).electronAPI?.setMotionPreference?.(r.mode); } catch { /* not in Electron */ }
  return r;
};

export const saveMotion = (patch: Partial<MotionPrefs>) => {
  const next = { ...readMotion(), ...patch };
  try { localStorage.setItem(MOTION_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  try { const bc = new BroadcastChannel(CHANNEL); bc.postMessage(next); bc.close(); } catch { /* ignore */ }
  emit();
};

let started = false;
/** Call once per window at start-up. */
export const initMotion = () => {
  if (started) return; started = true;
  applyMotion();
  const refresh = () => emit();
  window.addEventListener('storage', refresh);
  window.addEventListener('onboarding:calm', refresh);
  try { const bc = new BroadcastChannel(CHANNEL); bc.onmessage = refresh; } catch { /* ignore */ }
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', refresh);
  // The desktop shell tells a window when it has been shown: play the entry animation then, not while it is still hidden.
  const eApi = (window as any).electronAPI;
  if (eApi?.on && eApi?.signalContentReady) eApi.on('window-revealed', () => document.documentElement.classList.add('aw-entering'));
  else document.documentElement.classList.add('aw-entering'); // plain browser: play at once
  // Wait until the window has finished loading and settled: measuring during start-up would blame the PC for the load.
  setTimeout(() => { void detectPc(); }, 6000);
};

export const useMotion = () => {
  const [, setN] = useState(0);
  useEffect(() => {
    const l = () => setN(n => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return { prefs: readMotion(), pc: current, resolved: currentResolved() };
};

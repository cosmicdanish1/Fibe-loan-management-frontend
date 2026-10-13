import { useEffect, useState } from 'react';

/**
 * Which loading animation the app shows while data is being fetched.
 * Stored per-PC in localStorage and synced across open windows via a
 * BroadcastChannel, the same way the other Settings preferences are.
 */

export const LOADING_ANIMATIONS = [
  { id: 'fluid',   name: 'Liquid',  description: 'Gooey blobs that merge and split' },
  { id: 'ripple',  name: 'Ripple',  description: 'A grid of dots rippling outward' },
  { id: 'orbit',   name: 'Orbit',   description: 'Comet of dots circling a core' },
  { id: 'pulse',   name: 'Pulse',   description: 'Equalizer bars rising and falling' },
  { id: 'trace',   name: 'Trace',   description: 'A glowing line drawing itself' },
  { id: 'spinner', name: 'Simple Ring',  description: 'A plain spinning ring (lightest)' },
  { id: 'dots',    name: 'Simple Dots',  description: 'Three softly fading dots (lightest)' },
  { id: 'bar',     name: 'Simple Bar',   description: 'A thin sliding line (lightest)' },
] as const;

export type LoadingAnimationId = typeof LOADING_ANIMATIONS[number]['id'];

export const LOADING_ANIMATION_KEY = 'lms-loading-animation';
export const LOADING_ANIMATION_CHANNEL = 'lms_loading_animation';
export const DEFAULT_LOADING_ANIMATION: LoadingAnimationId = 'fluid';

const isValid = (v: unknown): v is LoadingAnimationId =>
  LOADING_ANIMATIONS.some(a => a.id === v);

export const readLoadingAnimation = (): LoadingAnimationId => {
  try {
    const v = localStorage.getItem(LOADING_ANIMATION_KEY);
    return isValid(v) ? v : DEFAULT_LOADING_ANIMATION;
  } catch { return DEFAULT_LOADING_ANIMATION; }
};

const listeners = new Set<(id: LoadingAnimationId) => void>();

export const saveLoadingAnimation = (id: LoadingAnimationId) => {
  try { localStorage.setItem(LOADING_ANIMATION_KEY, id); } catch { /* storage unavailable */ }
  listeners.forEach(fn => fn(id));
  try {
    const bc = new BroadcastChannel(LOADING_ANIMATION_CHANNEL);
    bc.postMessage({ id });
    bc.close();
  } catch { /* BroadcastChannel unavailable */ }
};

/** Current choice, kept live across Settings changes in this and other windows. */
export const useLoadingAnimation = (): LoadingAnimationId => {
  const [id, setId] = useState<LoadingAnimationId>(readLoadingAnimation);

  useEffect(() => {
    listeners.add(setId);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(LOADING_ANIMATION_CHANNEL);
      bc.onmessage = (e) => { if (isValid(e.data?.id)) setId(e.data.id); };
    } catch { /* BroadcastChannel unavailable */ }
    return () => { listeners.delete(setId); bc?.close(); };
  }, []);

  return id;
};

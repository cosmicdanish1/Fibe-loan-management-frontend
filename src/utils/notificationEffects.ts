// Central implementation for Settings → Notifications and Settings → Sound Effects.
//
// Both settings existed in the UI but nothing ever read them. The app raises
// toasts from 251 `message.*` call sites, so wrapping each one was never
// realistic. Instead this watches the single container antd renders toasts
// into, which covers every existing and future call site for free.
//
// Deliberate asymmetry: switching Notifications off hides success and info
// toasts but NOT errors and warnings. A silently swallowed "posting failed" in
// a ledger application is a data-integrity risk, not a preference.

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface EffectConfig {
  notifications: boolean;
  soundEffects: boolean;
}

let config: EffectConfig = { notifications: true, soundEffects: true };
let observer: MutationObserver | null = null;
let audioCtx: AudioContext | null = null;

// Short tones rather than audio files: client PCs install from an offline
// installer, and generated tones keep the bundle free of binary assets.
// Frequencies are chosen so error reads as clearly lower//graver than success.
const TONES: Record<ToastType, { freq: number; ms: number }> = {
  success: { freq: 880, ms: 90 },
  info: { freq: 660, ms: 80 },
  warning: { freq: 440, ms: 130 },
  error: { freq: 220, ms: 190 },
};

function playTone(type: ToastType): void {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    // Toasts always follow a user action, so the context is allowed to start.
    if (audioCtx.state === 'suspended') void audioCtx.resume();

    const { freq, ms } = TONES[type];
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.value = freq;
    // Quick fade out, otherwise the tone ends on a click.
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + ms / 1000);
  } catch {
    /* audio is a nicety - never let it break a toast */
  }
}

/** antd tags the type on an inner element, e.g. `ant-message-success`. */
function classifyToast(root: HTMLElement): ToastType | null {
  const types: ToastType[] = ['success', 'error', 'warning', 'info'];
  for (const t of types) {
    if (
      root.querySelector(`.ant-message-${t}, .ant-notification-notice-${t}`) ||
      root.classList.contains(`ant-message-notice-${t}`)
    ) {
      return t;
    }
  }
  return null;
}

function handleToast(node: HTMLElement): void {
  const type = classifyToast(node);
  if (!type) return;

  const suppressible = type === 'success' || type === 'info';
  if (!config.notifications && suppressible) {
    node.style.display = 'none';
    return; // hidden: don't announce it audibly either
  }

  if (config.soundEffects) playTone(type);
}

function ensureObserver(): void {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement)) return;
        // antd mounts the container lazily, so the toast may be the added node
        // itself or nested inside a freshly created wrapper.
        if (n.className && String(n.className).includes('notice')) handleToast(n);
        n.querySelectorAll?.('[class*="-notice"]').forEach((el) => handleToast(el as HTMLElement));
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/** Called by ThemeProvider whenever the settings change (in every window). */
export function configureNotificationEffects(next: EffectConfig): void {
  config = next;
  ensureObserver();
}

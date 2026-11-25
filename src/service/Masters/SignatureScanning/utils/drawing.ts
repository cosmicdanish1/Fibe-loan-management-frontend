// Pure helpers of the Signature Scanning window: pen pressure for the drawing area and the size of a scanned image.

export const MIN_WIDTH = 1.2;
export const MAX_WIDTH = 5;
export const MOUSE_WIDTH = 2.5;

/**
 * Line width of one stroke segment. A pen (graphics tablet or signature pad) reports pressure from 0 to 1, so a light
 * touch draws a thin line and a firm press a thick one. A mouse reports no real pressure, so it draws a steady line.
 * A pen or touch reading of 0 or less (some devices send 0 for the first point) is treated as a light touch.
 */
export function strokeWidth(pointerType: string, pressure: number): number {
  if (pointerType === 'mouse') return MOUSE_WIDTH;
  const p = Number.isFinite(pressure) && pressure > 0 ? Math.min(1, pressure) : 0.35;
  return MIN_WIDTH + p * (MAX_WIDTH - MIN_WIDTH);
}

/** Lines look smoother when the width moves a part of the way to the new value instead of jumping. */
export function smoothWidth(previous: number | null, next: number, weight = 0.6): number {
  return previous === null ? next : previous + (next - previous) * weight;
}

/**
 * While a pen is in use the hand rests on the pad, and touches from the palm must not draw. A touch is ignored when a
 * pen was seen within the last `windowMs` milliseconds.
 */
export function ignoreTouch(pointerType: string, lastPenAt: number, now: number, windowMs = 1500): boolean {
  return pointerType === 'touch' && lastPenAt > 0 && now - lastPenAt < windowMs;
}

/** Size to scale a scanned image down to so that it stays small enough to upload (longest side at most `max`). */
export function fitSize(width: number, height: number, max = 1400): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= max) return { width: Math.round(width), height: Math.round(height) };
  const k = max / longest;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

/** What the Scan button tells the user for each answer of the scanner service (null = say nothing). */
export function scanMessage(result: { ok: boolean; reason?: string; message?: string } | null | undefined): string | null {
  if (!result) return 'Scanning is not available here.';
  if (result.ok) return null;
  switch (result.reason) {
    case 'cancelled': return null;
    case 'no-scanner': return 'No scanner was found. Connect it, switch it on and try again.';
    case 'unsupported': return 'Scanning from the application works on Windows only.';
    case 'too-big': return 'The scanned image is too large. Scan at a lower resolution (200 dpi is enough for a signature).';
    default: return result.message ? `The scan failed: ${result.message}` : 'The scan failed. Try again.';
  }
}

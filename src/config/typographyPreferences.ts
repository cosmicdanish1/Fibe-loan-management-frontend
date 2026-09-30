export type TypographyRole = 'heading' | 'label' | 'body';
export type TypographyOffsets = Record<TypographyRole, number>;

export const TYPOGRAPHY_STORAGE_KEY = 'lms-typography-offsets';
export const TYPOGRAPHY_SYNC_CHANNEL = 'lms_typography_offsets';
export const DEFAULT_TYPOGRAPHY_OFFSETS: TypographyOffsets = { heading: 0, label: 0, body: 0 };

const clampOffset = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(-2, Math.min(4, Math.round(value))) : 0;

export const normalizeTypographyOffsets = (value: unknown): TypographyOffsets => {
  const offsets = value && typeof value === 'object' ? value as Partial<TypographyOffsets> : {};
  return {
    heading: clampOffset(offsets.heading),
    label: clampOffset(offsets.label),
    body: clampOffset(offsets.body),
  };
};

export const readTypographyOffsets = (): TypographyOffsets => {
  try {
    const saved = localStorage.getItem(TYPOGRAPHY_STORAGE_KEY);
    return saved ? normalizeTypographyOffsets(JSON.parse(saved)) : { ...DEFAULT_TYPOGRAPHY_OFFSETS };
  } catch {
    return { ...DEFAULT_TYPOGRAPHY_OFFSETS };
  }
};

export const applyTypographyOffsets = (offsets: TypographyOffsets): void => {
  const root = document.documentElement;
  root.style.setProperty('--type-heading-offset', `${offsets.heading}px`);
  root.style.setProperty('--type-label-offset', `${offsets.label}px`);
  root.style.setProperty('--type-body-offset', `${offsets.body}px`);
};

export const saveTypographyOffsets = (value: TypographyOffsets): TypographyOffsets => {
  const offsets = normalizeTypographyOffsets(value);
  applyTypographyOffsets(offsets);
  localStorage.setItem(TYPOGRAPHY_STORAGE_KEY, JSON.stringify(offsets));
  try {
    const channel = new BroadcastChannel(TYPOGRAPHY_SYNC_CHANNEL);
    channel.postMessage(offsets);
    channel.close();
  } catch { /* A single-window browser still keeps the local setting. */ }
  return offsets;
};

/** Base text size in px for a stored fontScale (Settings → Text Size: small / medium / large). */
export const fzBaseForScale = (fontScale: number): number =>
  fontScale <= 0.9 ? 12 : fontScale >= 1.2 ? 15 : 13;

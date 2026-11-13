// Dashboard art: an optional picture behind the top of the dashboard, chosen in
// Settings → Dashboard → Dashboard Art. Saved on this PC, like the rest of the dashboard look.
//
// Built-in pictures live in src/assets/dashboard-art/<category>/<name>-light.webp and
// <name>-dark.webp. They are found by folder and file name, so adding a picture to a category is
// only a matter of dropping the two files in; see the README in that folder.
//
// A user can also import one picture of their own. It is cut to the 3:1 banner shape, stored on this
// PC, and used in both Light and Dark.

/** Categories, in the order Settings shows them. A folder that is not listed here is still shown, after these, under its folder name. */
export const ART_CATEGORIES: { id: string; label: string; desc: string }[] = [
  { id: 'bauhaus', label: 'Bauhaus Geometry', desc: 'Circles, squares and structured arrangements' },
  { id: 'liquid', label: 'Liquid Art', desc: 'Flowing translucent forms and layered gradients' },
  { id: 'impressionist', label: 'Impressionist', desc: 'Painterly texture and visible brushwork' },
  { id: 'surreal', label: 'Surrealism', desc: 'Dreamlike scenes and floating forms' },
  { id: 'japanese', label: 'Japanese Minimalism', desc: 'Restrained compositions and natural elements' },
  { id: 'generative', label: 'Generative Art', desc: 'Mathematical curves and procedural patterns' },
  { id: 'papercut', label: 'Paper-Cut Art', desc: 'Overlapping paper layers with soft shadows' },
  { id: 'inkwash', label: 'Ink-Wash Art', desc: 'Ink textures and expressive brush marks' },
  { id: 'popart', label: 'Pop Art', desc: 'Bold shapes, halftone dots and strong colour' },
  { id: 'lineart', label: 'Line Art', desc: 'Fine outlines and delicate detailing' },
];

export interface Artwork { id: string; category: string; name: string; light: string | null; dark: string | null }
export interface ArtCategory { id: string; label: string; desc: string; artworks: Artwork[] }

/**
 * `art` is an artwork id ("japanese/01") or CUSTOM_ART for the user's own picture.
 * The picture can be shown in two places, each switched on its own:
 *  - `enabled`: behind the top of the whole dashboard;
 *  - `cards`: inside these widget cards (chosen card by card in the dashboard's Customize mode).
 */
export interface ArtConfig { enabled: boolean; art: string; cards: string[] }

export const CUSTOM_ART = 'custom';
export const ART_STORAGE_KEY = 'lms-dashboard-art';
export const ART_CUSTOM_KEY = 'lms-dashboard-art-custom';
export const DEFAULT_ART_CONFIG: ArtConfig = { enabled: false, art: 'japanese/01', cards: [] };

/** The banner shape every picture is shown in, and the size an imported picture is saved at. */
export const ART_RATIO = 3;
const CUSTOM_WIDTH = 2400;

const files = import.meta.glob('../../assets/dashboard-art/*/*.{webp,png,jpg,jpeg}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

// ".../dashboard-art/japanese/01-dark.webp" → artwork "japanese/01", dark picture
const artworks = new Map<string, Artwork>();
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/dashboard-art\/([^/]+)\/(.+)-(light|dark)\.[a-z]+$/i);
  if (!m) continue;
  const category = m[1]!.toLowerCase();
  const name = m[2]!;
  const id = `${category}/${name}`;
  const art = artworks.get(id) ?? { id, category, name, light: null, dark: null };
  art[m[3]!.toLowerCase() as 'light' | 'dark'] = url;
  artworks.set(id, art);
}

const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Every category that has at least one picture, with its pictures in file-name order. */
export const ART_LIBRARY: ArtCategory[] = (() => {
  const all = [...artworks.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const known = ART_CATEGORIES.map(c => ({ ...c, artworks: all.filter(a => a.category === c.id) }));
  const extraIds = [...new Set(all.map(a => a.category))].filter(id => !ART_CATEGORIES.some(c => c.id === id));
  const extra = extraIds.map(id => ({ id, label: titleCase(id), desc: '', artworks: all.filter(a => a.category === id) }));
  return [...known, ...extra].filter(c => c.artworks.length > 0);
})();

/** A built-in artwork's picture for a theme; the other theme's picture if that one is missing. */
export const artworkUrl = (art: Artwork, dark: boolean): string | null =>
  (dark ? art.dark ?? art.light : art.light ?? art.dark);

export const loadCustomArt = (): string | null => {
  try { return localStorage.getItem(ART_CUSTOM_KEY); } catch { return null; }
};

/** The chosen picture for this theme, whether or not it is switched on anywhere; null if it does not exist. */
export const resolvePicture = (config: ArtConfig, dark: boolean): string | null => {
  if (config.art === CUSTOM_ART) return loadCustomArt();
  const art = artworks.get(config.art);
  return art ? artworkUrl(art, dark) : null;
};

/** The picture to show behind the whole dashboard, or null when that is switched off. */
export const resolveArt = (config: ArtConfig, dark: boolean): string | null =>
  (config.enabled ? resolvePicture(config, dark) : null);

export const loadArtConfig = (): ArtConfig => {
  try {
    const saved = JSON.parse(localStorage.getItem(ART_STORAGE_KEY) || '{}');
    const art = typeof saved?.art === 'string' && (saved.art === CUSTOM_ART || artworks.has(saved.art)) ? saved.art : DEFAULT_ART_CONFIG.art;
    const cards = Array.isArray(saved?.cards) ? saved.cards.filter((c: unknown): c is string => typeof c === 'string') : [];
    return { enabled: saved?.enabled === true, art, cards };
  } catch {
    return DEFAULT_ART_CONFIG;
  }
};

export const saveArtConfig = (config: ArtConfig) => {
  try { localStorage.setItem(ART_STORAGE_KEY, JSON.stringify(config)); } catch { /* storage unavailable */ }
};

/**
 * Turns a picture the user picked into the dashboard's banner shape and stores it on this PC.
 * The picture is scaled to fill 3:1 and cut around its centre, so any size or shape can be imported.
 * Rejects with a message that can be shown to the user.
 */
export const importCustomArt = (file: File): Promise<string> => new Promise((resolve, reject) => {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { reject(new Error('Choose a PNG, JPG or WebP picture.')); return; }
  if (file.size > 25 * 1024 * 1024) { reject(new Error('That picture is larger than 25 MB. Choose a smaller one.')); return; }
  const source = URL.createObjectURL(file);
  const img = new Image();
  img.onerror = () => { URL.revokeObjectURL(source); reject(new Error('That file could not be read as a picture.')); };
  img.onload = () => {
    URL.revokeObjectURL(source);
    const width = Math.min(CUSTOM_WIDTH, Math.max(img.naturalWidth, 1200));
    const height = Math.round(width / ART_RATIO);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('This PC could not process the picture.')); return; }
    // cover: fill the banner, keep the middle of the picture
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    const data = canvas.toDataURL('image/webp', 0.86);
    try {
      localStorage.setItem(ART_CUSTOM_KEY, data);
    } catch {
      reject(new Error('The picture is too large to keep on this PC. Try a simpler or smaller one.'));
      return;
    }
    resolve(data);
  };
  img.src = source;
});

export const removeCustomArt = () => {
  try { localStorage.removeItem(ART_CUSTOM_KEY); } catch { /* storage unavailable */ }
};
